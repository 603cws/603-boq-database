import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import './form.css';
import { useForm, useFieldArray } from 'react-hook-form';
import { supabase } from './supabase';
import { toast, Toaster } from 'react-hot-toast';

const ProductForm = () => {
  const navigate = useNavigate(); // Initialize useNavigate
  const variantRef = useRef(null);
  const addonRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  // const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [subSubCategory, setSubSubCategory] = useState('');
  const [addonCat, setAddonCat] = useState('');
  const [variants, setVariants] = useState([{ title: '', price: '', details: '', mainImage: null, additionalImages: [], }]);

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

  const handleAddVariant = () => {
    setVariants([...variants, { title: '', price: '', details: '', mainImage: null, additionalImages: [], }]);
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

  const handleSubcategoryChange = (e) => {
    const options = e.target.options;
    const selectedValues = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedValues.push(options[i].value);
      }
    }
    setSelectedSubcategories(selectedValues.join(","));
  };

  const onSubmit = async (data) => {
    try {
      // Check if the product already exists based on category, subcategory, and subSubCategory
      const { data: existingProduct, error: existingProductError } = await supabase
        .from("products")
        .select("id")
        .eq("category", data.category)
        .eq("subcategory", selectedSubcategories)
        .eq("subcategory1", subSubCategory) // subSubCategory is from the state
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
          subcategory: selectedSubcategories,
          subcategory1: subSubCategory || null,  // Insert subSubCategory (from state)
        }).select().single();

        if (insertError) {
          console.error(insertError);
          toast.error("Error inserting new product.");
          return;
        }

        productId = Product.id;
        toast.success("New product inserted successfully.");
      }

      // Now proceed with adding variants
      for (const variant of variants) {
        if (variant.title && variant.price && variant.mainImage) {
          // Upload the main image to Supabase storage
          const { data: mainImageUpload, error: mainImageError } = await supabase.storage
            .from("addon")
            .upload(`${variant.title}-main-${productId}`, variant.mainImage);

          if (mainImageError) {
            console.error(mainImageError);
            toast.error(`Error uploading main image for variant: ${variant.title}`);
            break;
          }

          // Upload additional images
          const additionalImagePaths = [];
          for (const [index, imageFile] of variant.additionalImages.entries()) {
            const { data: additionalImageUpload, error: additionalImageError } = await supabase.storage
              .from("addon")
              .upload(`${variant.title}-additional-${index}-${productId}`, imageFile);

            if (additionalImageError) {
              console.error(additionalImageError);
              toast.error(`Error uploading additional image ${index + 1} for variant: ${variant.title}`);
              continue;
            }
            additionalImagePaths.push(additionalImageUpload.path);
          }

          // Insert the variant into the product_variants table
          const { error: variantError } = await supabase.from("product_variants").insert({
            product_id: productId,
            title: variant.title,
            price: variant.price,
            details: variant.details,
            image: mainImageUpload.path, // Store the main image path
            additional_images: additionalImagePaths, // Store paths of additional images
          });

          if (variantError) {
            console.error(variantError);
            toast.error(`Error inserting variant: ${variant.title}`);
            break;
          }
          toast.success(`Variant ${variant.title} added successfully.`);
        }
      }

      // Handle the addons
      const { data: addonCategory, error: addonCategoryError } = await supabase
        .from("addons")
        .insert({ title: addonCat, productid: productId })
        .select()
        .single();

      if (addonCategoryError) {
        console.error("Error inserting addon category:", addonCategoryError);
        toast.error("Failed to save addon category.");
        return;
      }

      const addonId = addonCategory.id;
      toast.success("Addon category saved successfully.");

      for (const addon of data.addons) {
        const { image, title, price } = addon;

        if (image && title && price) {
          const { data: addonVariantImage, error: addonVariantImageError } = await supabase.storage
            .from("addon")
            .upload(`${title}-${addonId}`, image[0]);

          if (addonVariantImageError) {
            console.error("Error uploading addon variant image:", addonVariantImageError);
            toast.error(`Failed to upload image for addon variant: ${title}`);
            continue;
          }

          const { error: addonVariantError } = await supabase.from("addon_variants").insert({
            addonid: addonId,
            title,
            price,
            image: addonVariantImage.path,
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

      // Success message
      toast.success("Data inserted successfully!");

      setTimeout(() => {
        toast.success("Page will refresh soon...");
      }, 2000);

      setTimeout(() => {
        window.location.reload();
      }, 5000);

    } catch (error) {
      console.error("Error in onSubmit:", error);
      toast.error("An unexpected error occurred.");
    }
  };

  return (
    <form className="" onSubmit={handleSubmit(onSubmit)}>
      <Toaster position="top-center" reverseOrder={false} />

      {/* Add a Go Back button */}
      <button
        type="button"
        className="mb-4 px-4 py-2 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
        onClick={() => navigate('/datatable')}
      >
        Go to Product Varaint Table
      </button>

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
          <label>Subcategories:</label>
          <select
            multiple
            onChange={handleSubcategoryChange}
          >
            {subcategories.map((subcategory, index) => (
              <option key={index} value={subcategory}>
                {subcategory}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Sub Subcategory Section */}
      <div>
        <label>Sub Sub Category:</label>
        <input
          type="text"
          value={subSubCategory}
          onChange={(e) => setSubSubCategory(e.target.value)}
        />
      </div>

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
              <label>Main Image:</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const updatedVariants = [...variants];
                  updatedVariants[index].mainImage = e.target.files[0]; // Set the main image
                  setVariants(updatedVariants);
                }}
              />
              {/* Preview the Main Image */}
              {variant.mainImage && (
                <div className="mt-2">
                  <h4>Preview Main Image:</h4>
                  <img
                    src={URL.createObjectURL(variant.mainImage)}
                    alt="Main Image"
                    className="h-20 w-20 object-cover border"
                  />
                </div>
              )}
            </div>

            <div>
              <label>Additional Images (Different Angles):</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const updatedVariants = [...variants];
                  updatedVariants[index].additionalImages = Array.from(e.target.files);
                  setVariants(updatedVariants);
                }}
              />
            </div>

            {variant.additionalImages.length > 0 && (
              <div className="mt-2">
                <h4>Preview Additional Images:</h4>
                <div className="grid grid-cols-3 gap-2">
                  {variant.additionalImages.map((image, i) => (
                    <img
                      key={i}
                      src={URL.createObjectURL(image)}
                      alt={`Angle ${i + 1}`}
                      className="h-20 w-20 object-cover border"
                    />
                  ))}
                </div>
              </div>
            )}

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
              onChange={(e) => {
                const file = e.target.files[0];
                const updatedAddons = [...fields];
                updatedAddons[index].image = file;
                // setFields(updatedAddons);
              }}
            />
            {errors.addons?.[index]?.image && <p>{errors.addons[index].image.message}</p>}

            {/* Image Preview */}
            {addon.image && (
              <div className="mt-2">
                <h4>Preview Addon Image:</h4>
                <img
                  src={URL.createObjectURL(addon.image)}
                  alt="Addon Image Preview"
                  className="h-20 w-20 object-cover border"
                />
              </div>
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
