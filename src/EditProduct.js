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
  });
  const [imageFile, setImageFile] = useState(null); // State to store the new image file

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

  // Handle form submission for updating the product
  const handleSubmit = async (e) => {
    e.preventDefault();

    let updatedValues = { ...formValues };

    // If a new image is selected, upload it to Supabase storage
    if (imageFile) {
      const fileName = `${imageFile.name.split('.')[0]}-${productId}`; // Generate file name
      const { error: uploadError } = await supabase.storage
        .from('addon')
        .upload(fileName, imageFile, {
          upsert: true, // Overwrite if it already exists
        });

      if (uploadError) {
        console.error('Error uploading image:', uploadError.message);
        return;
      }

      // Update the image field with the new file name
      updatedValues.image = fileName;
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

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit Product</h1>
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
          <label className="block text-gray-700 font-medium">Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full px-4 py-2 border rounded-lg"
          />
          {formValues.image && (
            <img
              src={`https://bwxzfwsoxwtzhjbzbdzs.supabase.co/storage/v1/object/public/addon/${formValues.image}`}
              alt="Current product"
              className="mt-4 w-32 h-32 object-cover rounded"
            />
          )}
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
