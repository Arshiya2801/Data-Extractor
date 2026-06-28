export const extractData = async (file, schemaString) => {
  // Remove trailing slash if present to prevent double-slashes causing 404s
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('schema', schemaString);

  try {
    const response = await fetch(`${apiUrl}/extract`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Server error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};
