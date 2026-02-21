// Simple encryption/decryption for localStorage
// Note: This is basic obfuscation, not true encryption. For production, consider using a proper encryption library.

const ENCRYPTION_KEY = 'blog_view_storage_key_2024';
const STORAGE_KEY = 'blog_viewed_ids';

// Simple XOR encryption (basic obfuscation)
const encrypt = (text) => {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result); // Base64 encode
};

const decrypt = (encryptedText) => {
  try {
    const decoded = atob(encryptedText);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (error) {
    return null;
  }
};

// Structure: { viewerType: [blogId1, blogId2, ...] }
// Example: { anonymous: ['id1', 'id2'], partial: ['id3'] }

export const addViewedBlogId = (blogId, viewerType) => {
  try {
    const viewedData = getViewedBlogIds();
    if (!viewedData[viewerType]) {
      viewedData[viewerType] = [];
    }
    if (!viewedData[viewerType].includes(blogId)) {
      viewedData[viewerType].push(blogId);
      const encrypted = encrypt(JSON.stringify(viewedData));
      localStorage.setItem(STORAGE_KEY, encrypted);
    }
    return true;
  } catch (error) {
    console.error('Error saving viewed blog ID:', error);
    return false;
  }
};

export const getViewedBlogIds = (viewerType = null) => {
  try {
    const encrypted = localStorage.getItem(STORAGE_KEY);
    if (!encrypted) return viewerType ? [] : {};
    
    const decrypted = decrypt(encrypted);
    if (!decrypted) return viewerType ? [] : {};
    
    const viewedData = JSON.parse(decrypted);
    
    // If viewerType is specified, return only that type's IDs
    if (viewerType) {
      return Array.isArray(viewedData[viewerType]) ? viewedData[viewerType] : [];
    }
    
    // Otherwise return all data
    return typeof viewedData === 'object' && viewedData !== null ? viewedData : {};
  } catch (error) {
    console.error('Error retrieving viewed blog IDs:', error);
    return viewerType ? [] : {};
  }
};

export const hasViewedBlog = (blogId, viewerType) => {
  if (!viewerType) return false;
  const viewedIds = getViewedBlogIds(viewerType);
  return viewedIds.includes(blogId);
};

export const clearViewedBlogIds = (viewerType = null) => {
  try {
    if (viewerType) {
      // Clear only specific viewer type
      const viewedData = getViewedBlogIds();
      delete viewedData[viewerType];
      const encrypted = encrypt(JSON.stringify(viewedData));
      localStorage.setItem(STORAGE_KEY, encrypted);
    } else {
      // Clear all
      localStorage.removeItem(STORAGE_KEY);
    }
    return true;
  } catch (error) {
    console.error('Error clearing viewed blog IDs:', error);
    return false;
  }
};

// Update anonymous view to partial (when user provides name/email)
export const updateAnonymousToPartial = (blogId) => {
  try {
    const viewedData = getViewedBlogIds();
    if (viewedData.anonymous && viewedData.anonymous.includes(blogId)) {
      // Remove from anonymous
      viewedData.anonymous = viewedData.anonymous.filter(id => id !== blogId);
      // Add to partial
      if (!viewedData.partial) {
        viewedData.partial = [];
      }
      if (!viewedData.partial.includes(blogId)) {
        viewedData.partial.push(blogId);
      }
      // Save updated data
      const encrypted = encrypt(JSON.stringify(viewedData));
      localStorage.setItem(STORAGE_KEY, encrypted);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating anonymous to partial:', error);
    return false;
  }
};

