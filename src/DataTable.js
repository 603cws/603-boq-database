import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase'; // Ensure your Supabase client is configured

const DataTable = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Fetch data from Supabase
    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('product_variants')
                .select(`id, title, price, details, product_id,
                products (
                    category, subcategory, subcategory1
                )
            `);
            setLoading(false);

            if (error) {
                console.error('Error fetching products:', error.message);
            } else {
                setProducts(data);
            }
        };

        fetchProducts();
    }, []);

    // Handle Delete action
    const handleDelete = async (id) => {
        const confirmDelete = window.confirm('Are you sure you want to delete this product?');
        if (!confirmDelete) return;

        setLoading(true);
        const { error } = await supabase.from('product_variants').delete().eq('id', id);
        setLoading(false);

        if (error) {
            console.error('Error deleting product:', error.message);
        } else {
            alert('Product deleted successfully!');
            setProducts((prev) => prev.filter((product) => product.id !== id)); // Update UI after deletion
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Product Variant Table Management</h1>
            <button
                onClick={() => navigate('/add')}
                className="mb-6 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                Add New Product Variant
            </button>
            {loading ? (
                <p className="text-center text-gray-500">Loading...</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse border border-gray-200">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-gray-200 px-4 py-2 text-left font-bold text-gray-700">ID</th>
                                <th className="border border-gray-200 px-4 py-2 text-left font-bold text-gray-700">Title</th>
                                <th className="border border-gray-200 px-4 py-2 text-left font-bold text-gray-700">Price</th>
                                <th className="border border-gray-200 px-4 py-2 text-left font-bold text-gray-700">Details</th>
                                <th className="border border-gray-200 px-4 py-2 text-left font-bold text-gray-700">Category</th>
                                <th className="border border-gray-200 px-4 py-2 text-left font-bold text-gray-700">Sub Category</th>
                                <th className="border border-gray-200 px-4 py-2 text-left font-bold text-gray-700">Sub-Sub Category</th>
                                <th className="border border-gray-200 px-4 py-2 text-left font-bold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length > 0 ? (
                                products.map((product) => (
                                    <tr
                                        key={product.id}
                                        className="hover:bg-gray-50 transition-colors border-t border-gray-200"
                                    >
                                        <td className="border border-gray-200 px-4 py-2 text-gray-800">{product.id}</td>
                                        <td className="border border-gray-200 px-4 py-2 text-gray-800">{product.title}</td>
                                        <td className="border border-gray-200 px-4 py-2 text-gray-800">₹{product.price}</td>
                                        <td className="border border-gray-200 px-4 py-2 text-gray-800">{product.details}</td>
                                        <td className="border border-gray-200 px-4 py-2 text-gray-800">{product.products?.category || 'N/A'}</td>
                                        <td className="border border-gray-200 px-4 py-2 text-gray-800">{product.products?.subcategory || 'N/A'}</td>
                                        <td className="border border-gray-200 px-4 py-2 text-gray-800">{product.products?.subcategory1 || 'N/A'}</td>
                                        <td className="border border-gray-200 px-4 py-2 text-gray-800">
                                            <div className="flex flex-col space-y-2 h-full justify-center">
                                                <button
                                                    // onClick={() => navigate(`/edit/${product.id}`)}
                                                    className="w-full px-4 py-2 bg-yellow-400 text-white rounded-lg shadow hover:bg-yellow-500 focus:outline-none"
                                                > 
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 focus:outline-none"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan="8"
                                        className="text-center text-gray-500 py-4 border border-gray-200"
                                    >
                                        No products found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default DataTable;
