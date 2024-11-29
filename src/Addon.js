import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase'; // Ensure Supabase client is configured

const Addon = () => {
    const [addons, setAddons] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editId, setEditId] = useState(null); // Track which row is being edited
    const [editTitle, setEditTitle] = useState(''); // Store the new title
    const navigate = useNavigate();

    // Fetch Addon Data from Supabase
    useEffect(() => {
        const fetchAddons = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('addons')
                .select(`
                    id, title, productid,
                    products (
                        id, category, subcategory, subcategory1
                    )
                `);
            setLoading(false);

            if (error) {
                console.error('Error fetching addons:', error.message);
            } else {
                setAddons(data);
            }
        };

        fetchAddons();
    }, []);

    // Handle Save Title Action
    const saveTitle = async (id) => {
        if (!editTitle.trim()) {
            alert('Title cannot be empty!');
            return;
        }

        setLoading(true);
        const { error } = await supabase
            .from('addons')
            .update({ title: editTitle })
            .eq('id', id);
        setLoading(false);

        if (error) {
            console.error('Error updating title:', error.message);
            alert('Failed to update title!');
        } else {
            setAddons((prev) =>
                prev.map((addon) =>
                    addon.id === id ? { ...addon, title: editTitle } : addon
                )
            );
            alert('Title updated successfully!');
            setEditId(null); // Exit edit mode
        }
    };

    // Handle Cancel Edit
    const cancelEdit = () => {
        setEditId(null);
        setEditTitle('');
    };

    // Handle Delete Action
    const handleDelete = async (id) => {
        const confirmDelete = window.confirm('Are you sure you want to delete this addon?');
        if (!confirmDelete) return;

        setLoading(true);
        const { error } = await supabase.from('addons').delete().eq('id', id);
        setLoading(false);

        if (error) {
            console.error('Error deleting addon:', error.message);
        } else {
            alert('Addon deleted successfully!');
            setAddons((prev) => prev.filter((addon) => addon.id !== id)); // Update UI after deletion
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Addon Management</h1>
            <div className="flex space-x-4 mb-6">
                <button
                    onClick={() => navigate('/AddonVariant')}
                    className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                    Manage Addon Variant
                </button>
                <button
                    onClick={() => navigate('/')}
                    className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                    Back to Manage Categories
                </button>
            </div>
            {loading ? (
                <p className="text-center text-gray-500">Loading...</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse border border-gray-200">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-gray-200 px-4 py-2 text-left font-bold text-gray-700">ID</th>
                                <th className="border border-gray-200 px-4 py-2 text-left font-bold text-gray-700">Title</th>
                                <th className="border border-gray-200 px-4 py-2 text-left font-bold text-gray-700">Category</th>
                                <th className="border border-gray-200 px-4 py-2 text-left font-bold text-gray-700">Sub Category</th>
                                <th className="border border-gray-200 px-4 py-2 text-left font-bold text-gray-700">Sub-Sub Category</th>
                                <th className="border border-gray-200 px-4 py-2 text-left font-bold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {addons.length > 0 ? (
                                addons.map((addon) => (
                                    <tr
                                        key={addon.id}
                                        className="hover:bg-gray-50 transition-colors border-t border-gray-200"
                                    >
                                        <td className="border border-gray-200 px-4 py-2 text-gray-800">{addon.id}</td>
                                        <td className="border border-gray-200 px-4 py-2 text-gray-800">
                                            {editId === addon.id ? (
                                                <input
                                                    type="text"
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded-md"
                                                />
                                            ) : (
                                                addon.title
                                            )}
                                        </td>
                                        <td className="border border-gray-200 px-4 py-2 text-gray-800">{addon.products?.category || 'N/A'}</td>
                                        <td className="border border-gray-200 px-4 py-2 text-gray-800">{addon.products?.subcategory || 'N/A'}</td>
                                        <td className="border border-gray-200 px-4 py-2 text-gray-800">{addon.products?.subcategory1 || 'N/A'}</td>
                                        <td className="border border-gray-200 px-4 py-2 text-gray-800">
                                            <div className="flex flex-col space-y-2 h-full justify-center">
                                                {editId === addon.id ? (
                                                    <>
                                                        <button
                                                            onClick={() => saveTitle(addon.id)}
                                                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 focus:outline-none"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={cancelEdit}
                                                            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg shadow hover:bg-gray-700 focus:outline-none"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setEditId(addon.id);
                                                                setEditTitle(addon.title);
                                                            }}
                                                            className="w-full px-4 py-2 bg-yellow-400 text-white rounded-lg shadow hover:bg-yellow-500 focus:outline-none"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(addon.id)}
                                                            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 focus:outline-none"
                                                        >
                                                            Delete
                                                        </button>
                                                    </>
                                                )}
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
                                        No addons found
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

export default Addon;
