import React, { useState, useEffect } from 'react';
import './form.css';
import { useForm, useFieldArray } from 'react-hook-form';
import { supabase } from './supabase';
import { toast, Toaster } from 'react-hot-toast';

const ProductForm = () => {
  const [categories, setCategories] = useState([]);

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

  const [variants, setVariants] = useState([{ title: '', price: '', details: '', image: null }]);

  const handleAddVariant = () => {
    setVariants([...variants, { title: '', price: '', details: '', image: null }]);
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
    for (const addon of data.addons) {
      const { image, title, price } = addon;

      // Log the addon data
      console.log("Addon Data:", addon);

      // Check if image, title, and price are provided
      if (image && title && price) {
        // Step 1: Upload the image to Supabase Storage
        const { data: addonImageData, error: addonImageError } = await supabase.storage
          .from('addon') // Ensure correct bucket name is used
          .upload(`${title}-${productId}`, image[0]); // Upload using the title and ensure image is a file input

        // Handle image upload error
        if (addonImageError) {
          console.error("Error uploading addon image:", addonImageError);
          toast.error(`Error uploading image for addon: ${title}`);
          continue; // Skip this iteration if upload fails
        }

        // Log the uploaded image path
        console.log("Uploaded image path:", addonImageData?.path);

        // Step 2: Insert the addon data into the database
        const { error: addonError } = await supabase.from('addons').insert({
          productid: productId,
          image: addonImageData?.path,  // Use the correct image path
          title: title,  // Use title from the current addon
          price: price,  // Use price from the current addon
        });

        // Handle error while inserting addon data
        if (addonError) {
          console.error("Error inserting addon:", addonError);
          toast.error(`Error inserting addon: ${title}`);
        } else {
          console.log("Addon inserted successfully");
          toast.success(`Addon ${title} added successfully.`);
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
      <Toaster position="top-center" reverseOrder={false}
        toastOptions={{ style: { margin: "0 auto", textAlign: "center", } }} />
      <div>
        <label>Category:</label>
        <select
          {...register('category', { required: 'Category is required' })}
          onChange={(e) => {
            const category = e.target.value;
            const selectedCatObj = categories.find(cat => cat.name === category);
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

      {subcategories.length > 0 && (
        <div>
          <label>Subcategory:</label>
          <select
            {...register('subcategory', { required: 'Subcategory is required' })}
            onChange={(e) => {
              setSelectedSubcategory(e.target.value);
              // Clear the sub subcategory input when the subcategory changes
              setSubSubCategory(''); // Make sure you have this state to store the sub sub category
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

      {selectedSubcategory && (
        <div>
          <label>Sub Sub Category:</label>
          <input
            type="text"
            value={subSubCategory} // You need a state variable to store this value
            onChange={(e) => setSubSubCategory(e.target.value)}
          />
        </div>
      )}

      <div>
        <h3>Product Variants</h3>
        {variants.map((variant, index) => (
          <div key={index}>
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
                onChange={(e) => {
                  const updatedVariants = [...variants];
                  updatedVariants[index].image = e.target.files;
                  setVariants(updatedVariants);
                }}
              />
            </div>

            <button type="button" onClick={() => handleRemoveVariant(index)}>
              Remove Variant
            </button>
          </div>
        ))}

        <button type="button" onClick={handleAddVariant}>
          Add Variant
        </button>
      </div>

      <div>
        <h3>Add-ons</h3>
        {fields.map((addon, index) => (
          <div key={addon.id}>
            <label>Image:</label>
            <input
              type="file"
              {...register(`addons.${index}.image`, { required: 'Image is required' })}
            />
            {errors.addons?.[index]?.image && <p>{errors.addons[index].image.message}</p>}

            <label>Title:</label>
            <input
              type="text"
              {...register(`addons.${index}.title`, { required: 'Addon title is required' })}
            />
            {errors.addons?.[index]?.title && <p>{errors.addons[index].title.message}</p>}

            <label>Price:</label>
            <input
              type="number"
              {...register(`addons.${index}.price`, { required: 'Addon price is required' })}
            />
            {errors.addons?.[index]?.price && <p>{errors.addons[index].price.message}</p>}

            <button type="button" onClick={() => remove(index)}>
              Remove Addon
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => append({ image: null, title: '', price: '' })}
        >
          Add Addon
        </button>
      </div>

      <button type="submit">Submit</button>
    </form>
  );
};

export default ProductForm;
