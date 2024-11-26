import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Import useNavigate
import { supabase } from './supabase'; // Ensure your Supabase client is configured

const EditProduct = () => {
  const { id: productId } = useParams(); // Extract the id parameter from the URL
  const navigate = useNavigate(); // Initialize useNavigate
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formValues, setFormValues] = useState({
    title: '',
    price: '',
    details: '',
  });

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

  // Handle form submission for updating the product
  const handleSubmit = async (e) => {
    e.preventDefault();

    const { error } = await supabase
      .from('product_variants')
      .update(formValues)
      .eq('id', productId);

    if (error) {
      console.error('Error updating product:', error.message);
    } else {
      alert('Product updated successfully!');
      navigate('/');
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
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default EditProduct;
