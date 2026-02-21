// Simple encryption/decryption for localStorage
// Note: This is basic obfuscation, not true encryption. For production, consider using a proper encryption library.

const ENCRYPTION_KEY = 'blog_comment_storage_key_2024';
const STORAGE_KEY = 'blog_comment_user_info';

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

export const saveUserInfo = (name, email) => {
  try {
    const data = {
      name: name || 'Anonymous',
      email: email && email.trim() ? email.trim() : '',
      timestamp: Date.now(),
    };
    const encrypted = encrypt(JSON.stringify(data));
    localStorage.setItem(STORAGE_KEY, encrypted);
    return true;
  } catch (error) {
    console.error('Error saving user info:', error);
    return false;
  }
};

export const getUserInfo = () => {
  try {
    const encrypted = localStorage.getItem(STORAGE_KEY);
    if (!encrypted) return null;
    
    const decrypted = decrypt(encrypted);
    if (!decrypted) return null;
    
    const data = JSON.parse(decrypted);
    return {
      name: data.name || 'Anonymous',
      email: data.email || '',
    };
  } catch (error) {
    console.error('Error retrieving user info:', error);
    return null;
  }
};

export const clearUserInfo = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing user info:', error);
    return false;
  }
};

