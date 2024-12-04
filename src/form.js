import React, { useState, useEffect, useRef } from 'react';
import './form.css';
import { useForm, useFieldArray } from 'react-hook-form';
import { supabase } from './supabase';
import { toast, Toaster } from 'react-hot-toast';

const ProductForm = () => {
  const [categories, setCategories] = useState([]);

  const variantRef = useRef(null);
  const addonRef = useRef(null);

  const fetchCategories = async () => {
    try {
      // Fetch data from the 'categories' table
      const { data, error } = await supabase
        .from('categories')
        .select('*'); // Adjust the select fields if necessary

      if (error) {
        throw new Error(error.message);
      }

      const formattedCategories = data.map(row => {

        return {
          name: row.name,
          // Ensure subcategories is an array, or set it to an empty array if it's null/undefined
          subcategories: Array.isArray(JSON.parse(row.subcategories)) ? JSON.parse(row.subcategories) : [],
        };
      });

      setCategories(formattedCategories); // Store categories in state
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []); // Empty dependency array ensures it runs once on mount

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      details: '',
      price: '',
      image: null,
      category: '',
      subcategory: '',
      addons: [{ image: null, title: '', price: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'addons'
  });

  const [subcategories, setSubcategories] = useState([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [subSubCategory, setSubSubCategory] = useState('');
  const [addonCat, setAddonCat] = useState('');
  const [variants, setVariants] = useState([{ title: '', price: '', details: '', image: null }]);

  const handleAddVariant = () => {
    setVariants([...variants, { title: '', price: '', details: '', image: null }]);
    // Scroll to the newly added variant
    setTimeout(() => {
      variantRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleAddAddon = () => {
    // Add a new addon logic
    append({ image: null, title: '', price: '' });

    // Scroll to the newly added addon
    setTimeout(() => {
      addonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleRemoveVariant = (index) => {
    const updatedVariants = variants.filter((_, i) => i !== index);
    setVariants(updatedVariants);
  };

  const onSubmit = async (data) => {
    // Check if the product already exists based on category, subcategory, and subSubCategory (from state)
    const { data: existingProduct, error: existingProductError } = await supabase
      .from("products")
      .select("id")
      .eq("category", data.category)
      .eq("subcategory", data.subcategory)
      .eq("subcategory1", subSubCategory)  // subSubCategory is from the state
      .single();

    if (existingProductError && existingProductError.code !== 'PGRST116') {
      console.error(existingProductError);
      toast.error("Error checking existing product.");
      return;
    }

    let productId;
    if (existingProduct) {
      // If the product already exists, use the existing product ID
      productId = existingProduct.id;
      toast.success("Product already exists. Proceeding with variants and addons.");
    } else {
      // Insert a new product if it doesn't exist
      const { data: Product, error: insertError } = await supabase.from("products").insert({
        category: data.category,
        subcategory: data.subcategory || null,
        subcategory1: subSubCategory || null,  // Insert subSubCategory (from state)
      }).select().single();

      if (insertError) {
        console.error(insertError);
        toast.error("Error inserting new product.");
        return;
      }

      // Use the newly inserted product ID
      productId = Product.id;
      toast.success("New product inserted successfully.");
    }

    // Now proceed with adding variants (using the productId)
    for (const variant of variants) {
      if (variant.title && variant.price && variant.image) {
        // Upload the variant image to Supabase storage
        const { data: VariantImage, error: VariantImageError } = await supabase.storage.from("addon").upload(`${variant.title}-${productId}`, variant.image[0]);

        if (VariantImageError) {
          console.error(VariantImageError);
          toast.error(`Error uploading image for variant: ${variant.title}`);
          await supabase.from("products").delete().eq("id", `${variant.title}-${productId}`); // Optionally delete if variant image upload fails
          break;
        }

        // Insert the variant into the product_variants table
        const { error: VariantError } = await supabase.from("product_variants").insert({
          product_id: productId,  // Link variant to the product
          title: variant.title,
          price: variant.price,
          details: variant.details,
          image: VariantImage.path,  // Image path from Supabase storage
        });

        if (VariantError) {
          console.error(VariantError);
          toast.error(`Error inserting variant: ${variant.title}`);
          await supabase.from("products").delete().eq("id", productId); // Rollback if variant insertion fails
          break;
        }
        toast.success(`Variant ${variant.title} added successfully.`);
      }
    }

    // Now handle the addons (if any)
    const { data: addonCategory, error: addonCategoryError } = await supabase
      .from('addons')
      .insert({ title: addonCat, productid: productId }) // Insert the Addon Category title
      .select()
      .single();

    if (addonCategoryError) {
      console.error("Error inserting addon category:", addonCategoryError);
      toast.error("Failed to save addon category.");
      return;
    }

    const addonId = addonCategory.id; // Store the retrieved addonId
    toast.success("Addon category saved successfully.");

    // Step 2: Insert Addon Variants
    for (const addon of data.addons) {
      const { image, title, price } = addon;

      if (image && title && price) {
        // Upload the variant image to Supabase storage
        const { data: addonVariantImage, error: addonVariantImageError } = await supabase.storage
          .from('addon') // Ensure correct bucket
          .upload(`${title}-${addonId}`, image[0]);

        if (addonVariantImageError) {
          console.error("Error uploading addon variant image:", addonVariantImageError);
          toast.error(`Failed to upload image for addon variant: ${title}`);
          continue; // Skip to the next variant if upload fails
        }

        // Insert the variant into the addon_variants table
        const { error: addonVariantError } = await supabase.from('addon_variants').insert({
          addonid: addonId, // Link the variant to the Addon Category 
          title,
          price,
          image: addonVariantImage.path, // Store the uploaded image path
        });

        if (addonVariantError) {
          console.error("Error inserting addon variant:", addonVariantError);
          toast.error(`Failed to save addon variant: ${title}`);
          return;
        } else {
          toast.success(`Addon variant ${title} added successfully.`);
        }
      }
    }

    // Show success toast for data insertion
    toast.success("Data inserted successfully!");

    // Show info toast for page refresh after a delay
    setTimeout(() => {
      toast.success("Page will refresh soon...");
    }, 2000);

    // Reload the page after some time
    setTimeout(() => {
      window.location.reload();
    }, 5000);
  };

  return (
    <form className="" onSubmit={handleSubmit(onSubmit)}>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          style: { margin: "0 auto", textAlign: "center" },
        }}
      />

      {/* Category Section */}
      <div>
        <label>Category:</label>
        <select
          {...register('category', { required: 'Category is required' })}
          onChange={(e) => {
            const category = e.target.value;
            const selectedCatObj = categories.find((cat) => cat.name === category);
            setSubcategories(selectedCatObj?.subcategories || []);
          }}
        >
          <option value="">Select Category</option>
          {categories.map((category, index) => (
            <option key={index} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.category && <p>{errors.category.message}</p>}
      </div>

      {/* Subcategory Section */}
      {subcategories.length > 0 && (
        <div>
          <label>Subcategory:</label>
          <select
            {...register('subcategory', { required: 'Subcategory is required' })}
            onChange={(e) => {
              setSelectedSubcategory(e.target.value);
              setSubSubCategory('');
            }}
          >
            <option value="">Select Subcategory</option>
            {subcategories.map((subcategory, index) => (
              <option key={index} value={subcategory}>
                {subcategory}
              </option>
            ))}
          </select>
          {errors.subcategory && <p>{errors.subcategory.message}</p>}
        </div>
      )}

      {/* Sub Subcategory Section */}
      {selectedSubcategory && (
        <div>
          <label>Sub Sub Category:</label>
          <input
            type="text"
            value={subSubCategory}
            onChange={(e) => setSubSubCategory(e.target.value)}
          />
        </div>
      )}

      {/* Product Variants Section */}
      <div>
        <h3>Product Variants</h3>
        {variants.map((variant, index) => (
          <div
            key={index}
            ref={index === variants.length - 1 ? variantRef : null} // Attach ref to the last variant
            className="p-4 border border-gray-300 rounded-lg my-2 shadow-sm"
          >
            <div>
              <label>Variant Title:</label>
              <input
                type="text"
                value={variant.title}
                onChange={(e) => {
                  const updatedVariants = [...variants];
                  updatedVariants[index].title = e.target.value;
                  setVariants(updatedVariants);
                }}
              />
            </div>

            <div>
              <label>Variant Price:</label>
              <input
                type="number"
                value={variant.price}
                onChange={(e) => {
                  const updatedVariants = [...variants];
                  updatedVariants[index].price = e.target.value;
                  setVariants(updatedVariants);
                }}
              />
            </div>

            <div>
              <label>Variant Details:</label>
              <textarea
                value={variant.details}
                onChange={(e) => {
                  const updatedVariants = [...variants];
                  updatedVariants[index].details = e.target.value;
                  setVariants(updatedVariants);
                }}
              />
            </div>

            <div>
              <label>Variant Image:</label>
              <input
                type="file"
                accept="image/*" // Accepts all image types like jpg, png, gif, etc.
                onChange={(e) => {
                  const updatedVariants = [...variants];
                  updatedVariants[index].image = e.target.files;
                  setVariants(updatedVariants);
                }}
              />
            </div>

            <button
              type="button"
              className="mt-2 px-4 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400"
              onClick={() => handleRemoveVariant(index)}
            >
              Remove Variant
            </button>
          </div>
        ))}

        <button
          type="button"
          className="mt-4 px-4 py-2 bg-teal-500 text-white font-semibold rounded-lg shadow-md hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-400"
          onClick={handleAddVariant}
        >
          Add Variant
        </button>
      </div>

      {/* Addon Section */}
      <div>
        <label>Addon Category:</label>
        <input
          type="text"
          value={addonCat}
          onChange={(e) => setAddonCat(e.target.value)}
        />
      </div>

      <div>
        <h3>Addon Variants</h3>
        {fields.map((addon, index) => (
          <div
            key={addon.id}
            ref={index === fields.length - 1 ? addonRef : null} // Attach ref to the last addon
            className="p-4 border border-gray-300 rounded-lg my-2 shadow-sm"
          >
            <label>Image:</label>
            <input
              type="file"
              accept="image/*" // Accepts all image types like jpg, png, gif, etc.
              {...register(`addons.${index}.image`, {
                required: 'Image is required',
              })}
            />
            {errors.addons?.[index]?.image && (
              <p>{errors.addons[index].image.message}</p>
            )}

            <label>Title:</label>
            <input
              type="text"
              {...register(`addons.${index}.title`, {
                required: 'Addon title is required',
              })}
            />
            {errors.addons?.[index]?.title && (
              <p>{errors.addons[index].title.message}</p>
            )}

            <label>Price:</label>
            <input
              type="number"
              {...register(`addons.${index}.price`, {
                required: 'Addon price is required',
              })}
            />
            {errors.addons?.[index]?.price && (
              <p>{errors.addons[index].price.message}</p>
            )}

            <button
              type="button"
              className="mt-2 px-4 py-2 bg-amber-500 text-white font-semibold rounded-lg shadow-md hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
              onClick={() => remove(index)}
            >
              Remove Addon
            </button>
          </div>
        ))}

        <button
          type="button"
          className="mt-4 px-4 py-2 bg-slate-500 text-white font-semibold rounded-lg shadow-md hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400"
          onClick={handleAddAddon}
        >
          Add Addon
        </button>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="mt-6 px-6 py-3 bg-emerald-500 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400"
      >
        Submit
      </button>
    </form>
  );
};

export default ProductForm;
