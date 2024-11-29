import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from './supabase'; // Supabase client configuration

const EditAddonVariant = () => {
    const { id } = useParams(); // Get the variant ID from the URL
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        title: '',
        price: '',
        image: null,
        addonid: '',
    });
    const [imagePreview, setImagePreview] = useState(null); // Preview for the image
    const [loading, setLoading] = useState(false);

    // Fetch the addon variant data by ID
    useEffect(() => {
        const fetchAddonVariant = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('addon_variants')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching addon variant:', error.message);
                setLoading(false);
                return;
            }

            // Populate form data and image preview
            setFormData({
                title: data.title || '',
                price: data.price || '',
                image: data.image || null,
                addonid: data.addonid || '',
            });
            setImagePreview(
                data.image
                    ? `https://bwxzfwsoxwtzhjbzbdzs.supabase.co/storage/v1/object/public/addon/${data.image}`
                    : null
            );
            setLoading(false);
        };

        fetchAddonVariant();
    }, [id]);

    // Handle form field changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Handle image selection
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData((prev) => ({ ...prev, image: file }));
            setImagePreview(URL.createObjectURL(file)); // Temporary preview
        }
    };

    // Save changes
    const handleSave = async () => {
        setLoading(true);

        // Prepare the new image name
        let newImageName = formData.image; // Default to existing image if no new image is uploaded
        if (formData.image instanceof File) {
            // Generate a new image name based on title and id
            const formattedTitle = formData.title.replace(/\s+/g, '_'); // Replace spaces with underscores
            newImageName = `${formattedTitle}-${id}}`; // title-id

            // Upload the new image to Supabase storage
            const { error: uploadError } = await supabase.storage
                .from('addon')
                .upload(newImageName, formData.image);

            if (uploadError) {
                console.error('Error uploading image:', uploadError.message);
                alert('Failed to upload image.');
                setLoading(false);
                return;
            }
        }

        // Update the database with the new data
        const { error } = await supabase
            .from('addon_variants')
            .update({
                title: formData.title,
                price: formData.price,
                image: newImageName, // Use the new or existing image name
            })
            .eq('id', id);

        if (error) {
            console.error('Error updating addon variant:', error.message);
            alert('Failed to save changes.');
        } else {
            alert('Addon variant updated successfully!');
            navigate('/AddonVariant'); // Redirect to the addon variant page
        }

        setLoading(false);
    };

    // Handle cancel action with confirmation
    const handleCancel = () => {
        const confirmCancel = window.confirm("You have unsaved changes. Do you still want to leave?");
        if (confirmCancel) {
            navigate('/AddonVariant'); // Redirect to the addon variant page
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit Addon Variant</h1>
            {loading ? (
                <p className="text-center text-gray-500">Loading...</p>
            ) : (
                <form
                    className="space-y-6"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSave();
                    }}
                >
                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Title</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Price</label>
                        <input
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Image</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none"
                        />
                        {imagePreview && (
                            <div className="mt-4">
                                <img
                                    src={imagePreview}
                                    alt="Selected"
                                    className="w-32 h-32 object-cover rounded-lg"
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">Addon ID</label>
                        <input
                            type="text"
                            name="addonid"
                            value={formData.addonid}
                            readOnly
                            className="w-full px-4 py-2 border bg-gray-100 rounded-lg focus:outline-none"
                        />
                    </div>

                    <div className="flex space-x-4">
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700"
                        >
                            Save Changes
                        </button>
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="px-6 py-2 bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md hover:bg-gray-400"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default EditAddonVariant;
