import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabase';

const EditProduct = () => {
  const { id: productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formValues, setFormValues] = useState({
    title: '',
    price: '',
    details: '',
    image: '',
    additional_images: '[]', // JSON string for additional images
  });
  const [imageFile, setImageFile] = useState(null); // Main image file
  const [additionalImageFiles, setAdditionalImageFiles] = useState([]); // New additional images

  const baseImageUrl = 'https://bwxzfwsoxwtzhjbzbdzs.supabase.co/storage/v1/object/public/addon/';

  // Fetch product details for editing
  useEffect(() => {
    if (productId) {
      const fetchProduct = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('product_variants')
          .select('*')
          .eq('id', productId)
          .single();
        setLoading(false);

        if (error) {
          console.error('Error fetching product:', error.message);
        } else {
          setProduct(data);
          setFormValues({
            title: data.title,
            price: data.price,
            details: data.details,
            image: data.image,
            additional_images: data.additional_images || '[]', // Ensure we get a JSON string
          });
        }
      };

      fetchProduct();
    }
  }, [productId]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
    }
  };

  // Handle additional image file selection
  const handleAdditionalImagesChange = (e) => {
    const files = Array.from(e.target.files);
    setAdditionalImageFiles((prev) => [...prev, ...files]);
  };

  // Delete a specific additional image
  const deleteAdditionalImage = async (imageName) => {
    const images = JSON.parse(formValues.additional_images || '[]').filter((img) => img !== imageName);

    // Update the database
    const { error } = await supabase
      .from('product_variants')
      .update({ additional_images: JSON.stringify(images) })
      .eq('id', productId);

    if (error) {
      console.error('Error deleting additional image:', error.message);
    } else {
      setFormValues((prev) => ({
        ...prev,
        additional_images: JSON.stringify(images),
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    let updatedValues = { ...formValues };

    // Upload main image if updated
    if (imageFile) {
      const fileName = `${imageFile.name.split('.')[0]}-${productId}`;
      const { error: uploadError } = await supabase.storage
        .from('addon')
        .upload(fileName, imageFile, {
          upsert: true,
        });

      if (uploadError) {
        console.error('Error uploading image:', uploadError.message);
        return;
      }

      updatedValues.image = fileName;
    }

    // Upload additional images
    if (additionalImageFiles.length > 0) {
      const uploadedImages = [];
      for (const file of additionalImageFiles) {
        const fileName = `${file.name.split('.')[0]}-${productId}-${Date.now()}`;
        const { error: uploadError } = await supabase.storage
          .from('addon')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Error uploading additional image:', uploadError.message);
          return;
        }

        uploadedImages.push(fileName);
      }

      const existingImages = JSON.parse(formValues.additional_images || '[]');
      updatedValues.additional_images = JSON.stringify([...existingImages, ...uploadedImages]);
    }

    // Update the product details in the database
    const { error } = await supabase
      .from('product_variants')
      .update(updatedValues)
      .eq('id', productId);

    if (error) {
      console.error('Error updating product:', error.message);
    } else {
      alert('Product updated successfully!');
      navigate('/datatable');
    }
  };

  // Handle cancel and confirm if user wants to discard changes
  const handleCancel = () => {
    const discardChanges = window.confirm('Are you sure you want to discard your changes?');
    if (discardChanges) {
      navigate('/datatable');
    }
  };

  if (loading) return <p>Loading...</p>;

  // Parse additional_images JSON
  const additionalImages = JSON.parse(formValues.additional_images || '[]');

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit Product Variant</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 font-medium">Title</label>
          <input
            type="text"
            name="title"
            value={formValues.title}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 font-medium">Price</label>
          <input
            type="number"
            name="price"
            value={formValues.price}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 font-medium">Details</label>
          <textarea
            name="details"
            value={formValues.details}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded-lg"
            rows="4"
          />
        </div>
        <div>
          <label className="block text-gray-700 font-medium">Main Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full px-4 py-2 border rounded-lg"
          />
          <div className="flex space-x-4 mt-4">
            {/* Show existing image */}
            {formValues.image && !imageFile && (
              <img
                src={`${baseImageUrl}${formValues.image}`}
                alt="Current product"
                className="w-32 h-32 object-cover rounded border border-gray-300 shadow"
              />
            )}
            {/* Show preview of new selected image */}
            {imageFile && (
              <div className="relative w-32 h-32">
                <img
                  src={URL.createObjectURL(imageFile)}
                  alt="New preview"
                  className="w-full h-full object-cover rounded-lg border border-gray-300 shadow"
                />
                <button
                  type="button"
                  onClick={() => setImageFile(null)}
                  className="absolute top-2 right-2 bg-red-600 text-white w-6 h-6 flex items-center justify-center rounded-full shadow hover:bg-red-700"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-gray-700 font-medium">Additional Images</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleAdditionalImagesChange}
            className="w-full px-4 py-2 border rounded-lg"
          />
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Display existing additional images */}
            {additionalImages.map((img, index) => (
              <div key={index} className="relative w-32 h-32">
                <img
                  src={`${baseImageUrl}${img}`}
                  alt={`Additional ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg border border-gray-300 shadow"
                />
                <button
                  type="button"
                  onClick={() => deleteAdditionalImage(img)}
                  className="absolute top-2 right-2 bg-red-600 text-white w-6 h-6 flex items-center justify-center rounded-full shadow hover:bg-red-700"
                >
                  ×
                </button>
              </div>
            ))}

            {/* Display preview of new selected files */}
            {additionalImageFiles.map((file, index) => (
              <div key={`preview-${index}`} className="relative w-32 h-32">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg border border-gray-300 shadow"
                />
                <button
                  type="button"
                  onClick={() =>
                    setAdditionalImageFiles((prev) =>
                      prev.filter((_, fileIndex) => fileIndex !== index)
                    )
                  }
                  className="absolute top-2 right-2 bg-red-600 text-white w-6 h-6 flex items-center justify-center rounded-full shadow hover:bg-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex space-x-4">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProduct;
