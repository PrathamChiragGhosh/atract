"use client";

import { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import { useBlogComments, useCreateComment } from '@/hooks/useBlogComments';
import { useJobSeekerProfile } from '@/hooks/useJobSeekerProfile';
import { useEmployerProfile } from '@/hooks/useEmployerProfile';
import { saveUserInfo, getUserInfo } from '@/utils/commentStorage';
import { FaComment, FaUser, FaEnvelope, FaPaperPlane, FaSpinner } from 'react-icons/fa';
import './comments.css';

export default function CommentSection({ blogSlug }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [comment, setComment] = useState('');
  const [showForm, setShowForm] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userType, setUserType] = useState(null); // 'jobseeker', 'employer', or null
  const commentEndRef = useRef(null);

  // Fetch profiles for logged-in users
  const jsToken = typeof window !== 'undefined' ? Cookies.get('js_token') : null;
  const empToken = typeof window !== 'undefined' ? Cookies.get('emp_token') : null;
  const { data: jobSeekerProfile } = useJobSeekerProfile();
  const { data: employerProfile } = useEmployerProfile();

  // Load user info with priority: logged-in user > comment form > empty
  useEffect(() => {
    let loadedName = '';
    let loadedEmail = '';
    let loadedUserType = null;

    // Priority 1: Check for logged-in job seeker
    if (jsToken) {
      try {
        const decoded = jwtDecode(jsToken);
        loadedUserType = 'jobseeker';
        
        // Get name and email from profile if available (preferred)
        if (jobSeekerProfile) {
          loadedName = jobSeekerProfile.fullName || decoded.userName || '';
          loadedEmail = jobSeekerProfile.email || '';
        } else {
          // Fallback to token if profile not loaded yet
          loadedName = decoded.userName || '';
        }
      } catch (error) {
        console.error('Error decoding job seeker token:', error);
      }
    }

    // Priority 2: Check for logged-in employer (only if not job seeker)
    if (!loadedUserType && empToken) {
      try {
        const decoded = jwtDecode(empToken);
        loadedUserType = 'employer';
        
        // Get name and email from profile if available
        if (employerProfile) {
          loadedName = employerProfile.companyName || employerProfile.name || decoded.name || '';
          loadedEmail = employerProfile.email || decoded.email || '';
        } else {
          // Fallback to token if profile not loaded yet
          loadedName = decoded.name || decoded.companyName || '';
          loadedEmail = decoded.email || '';
        }
      } catch (error) {
        console.error('Error decoding employer token:', error);
      }
    }

    // Priority 3: Check comment form saved data (only if not logged in)
    if (!loadedUserType) {
      const userInfo = getUserInfo();
      if (userInfo) {
        loadedName = userInfo.name || '';
        loadedEmail = userInfo.email || '';
      }
    }

    // Set state
    if (loadedName || loadedEmail || loadedUserType) {
      if (loadedName) setName(loadedName);
      if (loadedEmail) setEmail(loadedEmail);
      if (loadedUserType) setUserType(loadedUserType);
      
      // For logged-in users, collapse form (auto-filled with their account info)
      // For anonymous users with saved name or email, also collapse
      if (loadedUserType) {
        // Logged in - collapse form (auto-filled with account info)
        setShowForm(false);
      } else if (loadedName || loadedEmail) {
        // Anonymous user with saved name or email - collapse form
        setShowForm(false);
      } else {
        // Show form if nothing is saved
        setShowForm(true);
      }
    }
  }, [jsToken, empToken, jobSeekerProfile, employerProfile]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useBlogComments(blogSlug);
  const createCommentMutation = useCreateComment(blogSlug);

  // Flatten all comments from pages
  const allComments = data?.pages?.flatMap(page => page.comments) || [];
  const totalCount = data?.pages?.[0]?.totalCount || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!comment.trim()) {
      alert('Please enter a comment');
      return;
    }

    // Validate email format if provided
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        alert('Please enter a valid email address');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Use logged-in user info if available (priority), otherwise use form values
      // Name and email are already set from token/comment form in useEffect
      const finalName = name.trim() || 'Anonymous';
      const finalEmail = email.trim() || '';
      
      // Determine commentorType and IDs
      let commentorType = 'anonymous';
      let jobSeekerId = null;
      let employerId = null;

      if (userType === 'jobseeker' && jsToken) {
        try {
          const decoded = jwtDecode(jsToken);
          commentorType = 'jobseeker';
          jobSeekerId = decoded.userId || decoded.id;
        } catch (error) {
          console.error('Error decoding job seeker token:', error);
        }
      } else if (userType === 'employer' && empToken) {
        try {
          const decoded = jwtDecode(empToken);
          commentorType = 'employer';
          employerId = decoded.userId || decoded.id;
        } catch (error) {
          console.error('Error decoding employer token:', error);
        }
      } else {
        // Check if we have name or email (partial) or neither (anonymous)
        if (finalName && finalName !== 'Anonymous' || finalEmail) {
          commentorType = 'partial';
        } else {
          commentorType = 'anonymous';
        }
      }
      
      // Save to localStorage only if not logged in (for anonymous/partial users)
      if (!userType) {
        saveUserInfo(finalName, finalEmail);
      }

      await createCommentMutation.mutateAsync({
        name: finalName,
        email: finalEmail,
        emailConfirmed: emailConfirmed,
        comment: comment.trim(),
        commentorType,
        jobSeekerId,
        employerId,
      });

      // Clear comment field
      setComment('');
      
      // Update from saved info (only if not logged in)
      if (!userType) {
        const savedInfo = getUserInfo();
        if (savedInfo) {
          setName(savedInfo.name);
          if (savedInfo.email) {
            setEmail(savedInfo.email);
          }
          // Collapse form if we have name or email
          if (savedInfo.name || savedInfo.email) {
            setShowForm(false);
          }
        }
      }

      // Scroll to the new comment
      setTimeout(() => {
        commentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      alert(error.message || 'Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <div className="blogview-comments-section">
      <div className="blogview-comments-header">
        <FaComment />
        <h2>Comments {totalCount > 0 && `(${totalCount})`}</h2>
      </div>

      {/* Comment Form */}
      <form className="blogview-comment-form" onSubmit={handleSubmit}>
        {!showForm && (
          <div className="blogview-comment-form-user">
            <FaUser />
            <span>{name || 'Anonymous'}</span>
            {email && email.trim() && <span className="blogview-comment-form-user-email">{email}</span>}
            <button
              type="button"
              className="blogview-comment-form-change-user"
              onClick={() => setShowForm(true)}
            >
              Change
            </button>
          </div>
        )}

        {showForm && (
          <>
            <div className="blogview-comment-form-row">
              <div className="blogview-comment-form-field">
                <label htmlFor="comment-name">
                  <FaUser />
                  Name {userType ? '(from your account)' : '(Optional)'}
                </label>
                <input
                  id="comment-name"
                  type="text"
                  placeholder={userType ? "Your name from account" : "Your name (leave blank for Anonymous)"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
                {userType && (
                  <small>You can change this if needed</small>
                )}
              </div>

              <div className="blogview-comment-form-field">
                <label htmlFor="comment-email">
                  <FaEnvelope />
                  Email {userType ? '(from your account)' : '(Optional)'}
                </label>
                <input
                  id="comment-email"
                  type="email"
                  placeholder={userType ? "Your email from account" : "your@email.com"}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    // Reset confirmation when email changes
                    if (!e.target.value.trim()) {
                      setEmailConfirmed(false);
                    }
                  }}
                />
                <small>We may use this to send blogs, jobs, and recommendations</small>
                {userType && (
                  <small className="blogview-comment-form-account-note">You can change this if needed</small>
                )}
                {email && email.trim() && (
                  <label className="blogview-comment-checkbox-label">
                    <input
                      type="checkbox"
                      checked={emailConfirmed}
                      onChange={(e) => setEmailConfirmed(e.target.checked)}
                    />
                    <span>I agree to receive blogs, jobs, and recommendations via email (optional)</span>
                  </label>
                )}
              </div>
            </div>
          </>
        )}

        <div className="blogview-comment-form-field">
          <label htmlFor="comment-text">
            <FaComment />
            Your Comment <span className="required">*</span>
          </label>
          <textarea
            id="comment-text"
            placeholder="Share your thoughts..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
            rows={4}
            maxLength={2000}
          />
          <small>{comment.length}/2000 characters</small>
        </div>

        <button
          type="submit"
          className="blogview-comment-submit-btn"
          disabled={isSubmitting || !comment.trim()}
        >
          {isSubmitting ? (
            <>
              <FaSpinner className="spinning" />
              Posting...
            </>
          ) : (
            <>
              <FaPaperPlane />
              Post Comment
            </>
          )}
        </button>
      </form>

      {/* Comments List */}
      <div className="blogview-comments-list">
        {isLoading ? (
          <div className="blogview-comments-loading">
            <FaSpinner className="spinning" />
            <p>Loading comments...</p>
          </div>
        ) : allComments.length === 0 ? (
          <div className="blogview-comments-empty">
            <FaComment />
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          <>
            {allComments.map((commentItem) => (
              <div key={commentItem._id} className="blogview-comment-item">
                <div className="blogview-comment-item-header">
                  <div className="blogview-comment-item-author">
                    <FaUser />
                    <strong>{commentItem.name || 'Anonymous'}</strong>
                  </div>
                  <span className="blogview-comment-item-date">
                    {new Date(commentItem.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="blogview-comment-item-content">
                  {commentItem.comment}
                </div>
              </div>
            ))}
            <div ref={commentEndRef} />
            
            {hasNextPage && (
              <div className="blogview-comments-load-more">
                <button
                  onClick={handleLoadMore}
                  disabled={isFetchingNextPage}
                  className="blogview-comments-load-more-btn"
                >
                  {isFetchingNextPage ? (
                    <>
                      <FaSpinner className="spinning" />
                      Loading...
                    </>
                  ) : (
                    'Load More Comments'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

