import React, { useState, useEffect } from 'react';
import { supabase } from './supabase'; // Import your Supabase client
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newCategory, setNewCategory] = useState({ name: '', subcategories: '' }); // State for new category
    const [editCategory, setEditCategory] = useState(null); // State for editing a category
    const navigate = useNavigate();

    // Fetch categories from Supabase
    const fetchCategories = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('categories') // Replace with your table name
                .select('*'); // Fetch all columns
            if (error) {
                throw error;
            }
            setCategories(data);
        } catch (error) {
            console.error('Error fetching categories:', error.message);
        } finally {
            setLoading(false);
        }
    };

    // Add a new category to Supabase
    const handleAdd = async () => {
        if (!newCategory.name || !newCategory.subcategories) {
            alert('Please fill out both Name and Subcategories fields.');
            return;
        }

        try {
            // Fetch the last inserted category to get the latest `id`
            const { data: lastCategory, error: fetchError } = await supabase
                .from('categories')
                .select('id')
                .order('id', { ascending: false })
                .limit(1);

            if (fetchError) {
                throw fetchError;
            }

            // Calculate the new `id`
            const newId = lastCategory.length > 0 ? lastCategory[0].id + 1 : 1;

            // Prepare the subcategories as an array
            const subcategoriesArray = newCategory.subcategories.split(',').map((subcategory) => subcategory.trim());

            // Prepare the new category with the calculated `id`
            const newCategoryWithId = {
                ...newCategory,
                id: newId,
                subcategories: subcategoriesArray,
            };

            // Insert the category into the database
            const { error: insertError } = await supabase
                .from('categories')
                .insert([newCategoryWithId]);

            if (insertError) {
                throw insertError;
            }

            // Show success toast
            toast.success('Category added successfully!');

            // Optionally refresh the page
            setTimeout(() => {
                toast.success('Refreshing data...', { icon: '🔄' }); // Alternative to `toast.info`
                window.location.reload();
            }, 1500);

        } catch (error) {
            console.error('Error adding category:', error.message);
            toast.error('Failed to add category.');
        }
    };

    // Edit an existing category in Supabase
    const handleEdit = async () => {
        if (!editCategory || !editCategory.name || !editCategory.subcategories) {
            toast.error('Please provide updated Name and Subcategories.');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('categories')
                .update({
                    name: editCategory.name,
                    subcategories: editCategory.subcategories, // Save as comma-separated string
                })
                .eq('id', editCategory.id);

            if (error) {
                throw error;
            }

            // Show success message
            toast.success('Table updated successfully!');

            // Refresh the page to reflect changes
            setTimeout(() => {
                toast.success('Refreshing data...', { icon: '🔄' }); // Alternative to `toast.info`
                window.location.reload();
            }, 1500); // Optionally, adjust the delay as needed

        } catch (error) {
            console.error('Error editing category:', error.message);
            toast.error('Failed to update category.');
        }
    };

    // Delete a category from Supabase
    const handleDelete = async (id) => {
        const confirmDelete = window.confirm('Are you sure you want to delete this category?');
        if (!confirmDelete) return;

        try {
            const { error } = await supabase
                .from('categories')
                .delete()
                .eq('id', id); // Match the category by ID
            if (error) {
                throw error;
            }
            setCategories(categories.filter((category) => category.id !== id)); // Remove the category from state
        } catch (error) {
            console.error('Error deleting category:', error.message);
        }
    };

    // Fetch categories when the component loads
    useEffect(() => {
        fetchCategories();
    }, []);

    return (
        <div className="p-4">
            <div className="p-4">
                <Toaster position="top-right" reverseOrder={false} />
                <h1 className="text-2xl font-bold mb-4">Manage Categories</h1>
            </div>

            {/* Add New Category */}
            <div className="mb-4">
                <h2 className="text-xl font-semibold mb-2">Add New Category</h2>
                <input
                    type="text"
                    placeholder="Category Name"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="border border-gray-300 rounded px-2 py-1 mr-2"
                />
                <input
                    type="text"
                    placeholder="Subcategories (comma separated)"
                    value={newCategory.subcategories}
                    onChange={(e) => setNewCategory({
                        ...newCategory,
                        subcategories: e.target.value.split(',').map(subcategory => subcategory.trim()).join(',')
                    })}
                    className="border border-gray-300 rounded px-2 py-1 mr-2"
                    title="Enter subcategories separated by commas (e.g., option1, option2)"
                />
                <button
                    onClick={handleAdd}
                    className="px-4 py-2 bg-[#387478] text-white font-semibold rounded-lg shadow-md hover:bg-[#629584] focus:outline-none focus:ring-2 focus:ring-blue-500"
                // bg-blue-600
                >
                    Add Category
                </button>
                <button
                    onClick={() => navigate('/datatable')}
                    className="mb-6 ml-4 px-4 py-2 bg-[#8adfa3] text-white font-semibold rounded-lg shadow-md hover:bg-[#9abf80] focus:outline-none focus:ring-2 focus:ring-green-500"
                // bg-orange-400
                >
                    Manage Products
                </button>
                <button
                    onClick={() => navigate('/Addon')}
                    className="mb-6 ml-4 px-4 py-2 bg-[#ffbf61] text-white font-semibold rounded-lg shadow-md hover:bg-[#ffad60] focus:outline-none focus:ring-2 focus:ring-purple-500"
                // bg-green-600
                >
                    Manage Add-ons
                </button>
            </div>

            {/* Edit Category */}
            {editCategory && (
                <div className="mb-4">
                    <h2 className="text-xl font-semibold mb-2">Edit Category</h2>
                    <input
                        type="text"
                        placeholder="Category Name"
                        value={editCategory.name}
                        onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })}
                        className="border border-gray-300 rounded px-2 py-1 mr-2"
                    />
                    <input
                        type="text"
                        placeholder="Subcategories (comma separated)"
                        value={editCategory.subcategories}
                        onChange={(e) => setEditCategory({
                            ...editCategory,
                            subcategories: e.target.value.split(',').map(subcategory => subcategory.trim()).join(',')
                        })}
                        className="border border-gray-300 rounded px-2 py-1 mr-2"
                    />
                    <button
                        onClick={handleEdit}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg shadow-md hover:bg-yellow-700 focus:outline-none"
                    >
                        Update Category
                    </button>
                </div>
            )}

            {/* Categories Table */}
            {loading ? (
                <p>Loading categories...</p>
            ) : (
                <table className="min-w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="border border-gray-300 px-4 py-2">Category Id</th>
                            <th className="border border-gray-300 px-4 py-2">Category Name</th>
                            <th className="border border-gray-300 px-4 py-2">Subcategories</th>
                            <th className="border border-gray-300 px-4 py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories
                            .sort((a, b) => a.id - b.id)  // Sort categories in ascending order by `id`
                            .map((category) => (
                                <tr key={category.id}>
                                    <td className="border border-gray-300 px-4 py-2">{category.id}</td>
                                    <td className="border border-gray-300 px-4 py-2">{category.name}</td>
                                    <td className="border border-gray-300 px-4 py-2">
                                        {category.subcategories ? (
                                            <span>{category.subcategories}</span>
                                        ) : (
                                            'No subcategories'
                                        )}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2 flex flex-col space-y-2">
                                        <button
                                            onClick={() => {
                                                setEditCategory(category);
                                                window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top smoothly
                                            }}
                                            className="w-full px-4 py-2 bg-yellow-400 text-white rounded-lg shadow hover:bg-yellow-500 focus:outline-none"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(category.id)}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 focus:outline-none"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default Categories;
