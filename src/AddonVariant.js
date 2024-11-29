import React, { useEffect, useState } from 'react';
import { supabase } from './supabase'; // Ensure Supabase client is configured
import { useNavigate } from 'react-router-dom'; // For navigation

const AddonVariant = () => {
    const [addonVariants, setAddonVariants] = useState([]);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate(); // For navigation

    // Fetch Addon Variants Data
    useEffect(() => {
        const fetchAddonVariants = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('addon_variants')
                .select(`
                    id, title, price, image, addonid,
                    addons (title)
                `);
            if (error) {
                console.error('Error fetching addon variants:', error.message);
                setLoading(false);
                return;
            }

            // Base URL of your storage bucket
            const baseUrl = 'https://bwxzfwsoxwtzhjbzbdzs.supabase.co/storage/v1/object/public/addon';

            // Map through data and construct image URLs
            const updatedData = data.map((variant) => ({
                ...variant,
                image: variant.image ? `${baseUrl}/${variant.image}` : null, // Construct URL or set to null
            }));

            setAddonVariants(updatedData);
            setLoading(false);
        };

        fetchAddonVariants();
    }, []);

    // Handle Edit Action
    const handleEdit = (id) => {
        navigate(`/edit-addon-variant/${id}`); // Navigate to edit page with the selected variant ID
    };

    // Handle Delete Action
    const handleDelete = async (id) => {
        const confirmDelete = window.confirm('Are you sure you want to delete this addon variant?');
        if (!confirmDelete) return;

        setLoading(true);
        const { error } = await supabase
            .from('addon_variants')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting addon variant:', error.message);
        } else {
            setAddonVariants((prev) => prev.filter((variant) => variant.id !== id)); // Remove the deleted variant from the list
            alert('Addon variant deleted successfully!');
        }
        setLoading(false);
    };

    return (
        <div className="p-6 max-w-6xl mx-auto bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Addon Variants</h1>
            <button
                onClick={() => navigate('/Addon')} // Navigate back to the previous page
                className="mb-6 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                Back to Addon Management
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
                                <th className="border border-gray-200 px-4 py-2 text-left font-bold text-gray-700">Image</th>
                                <th className="border border-gray-200 px-4 py-2 text-left font-bold text-gray-700">Addon Title</th>
                                <th className="border border-gray-200 px-4 py-2 text-left font-bold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {addonVariants.length > 0 ? (
                                addonVariants.map((variant) => (
                                    <tr
                                        key={variant.id}
                                        className="hover:bg-gray-50 transition-colors border-t border-gray-200"
                                    >
                                        <td className="border border-gray-200 px-4 py-2 text-gray-800">{variant.id}</td>
                                        <td className="border border-gray-200 px-4 py-2 text-gray-800">{variant.title}</td>
                                        <td className="border border-gray-200 px-4 py-2 text-gray-800">₹{variant.price}</td>
                                        <td className="border border-gray-200 px-4 py-2 text-gray-800">
                                            {variant.image ? (
                                                <img
                                                    src={variant.image}
                                                    alt={variant.title}
                                                    className="w-16 h-16 object-cover rounded-md"
                                                />
                                            ) : (
                                                'No Image'
                                            )}
                                        </td>
                                        <td className="border border-gray-200 px-4 py-2 text-gray-800">
                                            {variant.addons?.title || 'N/A'}
                                        </td>
                                        <td className="border border-gray-200 px-4 py-2 text-gray-800">
                                            <div className="flex space-x-4">
                                                <button
                                                    onClick={() => handleEdit(variant.id)}
                                                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(variant.id)}
                                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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
                                        colSpan="6"
                                        className="text-center text-gray-500 py-4 border border-gray-200"
                                    >
                                        No addon variants found
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

export default AddonVariant;
