# Custom Dropdown Pattern for Application

This document outlines the standard pattern for implementing custom dropdowns throughout the entire application.

## Key Requirements

### 1. Mobile Scroll Behavior
- **CRITICAL**: On mobile (≤768px), dropdowns MUST close when scrolling
- Listen to BOTH `window` scroll and any scrollable container (e.g., modal body) scroll events
- Only add scroll listeners when `isMobile === true`

### 2. Z-Index Hierarchy
The correct z-index layering is:
- **Inputs**: `z-index: 1`
- **Dropdowns**: `z-index: 900` (dropdown menus)
- **Dropdown containers when open**: `z-index: 902-903`
- **Footers/Modal footers**: `z-index: 1000` (must be above dropdowns)
- **Navbar**: `z-index: 1010` (must be above everything)
- **Modal overlay**: `z-index: 10000`
- **Modal content**: `z-index: 10001`

### 3. Overflow Handling
- **Parent containers** (form-group, sections, grids): `overflow: visible !important` on mobile
- **Dropdown menus**: `overflow-y: auto` and `overflow-x: hidden` for scrolling
- **Scrollable containers** (modal body): `overflow-y: auto` and `overflow-x: hidden`

### 4. Mobile Positioning
- Use `position: fixed` on mobile for dropdowns
- Calculate position **synchronously** before opening to prevent blinking
- Store position in state: `{ top, left, width }`
- Apply inline styles: `style={isMobile ? { position: 'fixed', top: `${position.top}px`, left: `${position.left}px`, width: `${position.width}px` } : {}}`

## Implementation Checklist

When adding a new custom dropdown:

### JavaScript
- [ ] Add `useRef` for dropdown element
- [ ] Add position state: `const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 })`
- [ ] Add `isMobile` state detection (≤768px)
- [ ] Add `updateDropdownPosition` function
- [ ] Add `useEffect` for desktop position updates (conditional on `!isMobile`)
- [ ] Add scroll handler `useEffect` that:
  - Only runs when `isMobile === true`
  - Listens to `window` scroll
  - Listens to any scrollable parent container (e.g., modal body ref)
  - Closes all dropdowns on scroll
- [ ] Add click outside handler
- [ ] In `onClick` handler, calculate position **synchronously** before setting dropdown open state (mobile only)
- [ ] Add `dropdown-open` class to both `.form-group` and `.custom-dropdown` when open
- [ ] Close all other dropdowns when opening a new one

### CSS
- [ ] Set dropdown menu `z-index: 900` (below footer at 1000, navbar at 1010)
- [ ] Set footer/modal footer `z-index: 1000 !important`
- [ ] Add `overflow-y: auto` and `overflow-x: hidden` to `.custom-dropdown-menu`
- [ ] On mobile, add `overflow: visible !important` to:
  - `.form-group`
  - `.form-group.dropdown-open`
  - Parent sections/grids/containers
- [ ] On mobile, set dropdown menu to `position: fixed !important`
- [ ] Add proper z-index values for `.form-group.dropdown-open` (902) and `.custom-dropdown.dropdown-open` (903)

## Example Code

### JavaScript Pattern

```javascript
// Refs and states
const dropdownRef = useRef(null);
const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
const [isMobile, setIsMobile] = useState(false);
const [showDropdown, setShowDropdown] = useState(false);

// Mobile detection
useEffect(() => {
    const checkMobile = () => {
        setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
}, []);

// Position calculation
const updateDropdownPosition = (selectRef, setPosition) => {
    if (selectRef.current) {
        const rect = selectRef.current.getBoundingClientRect();
        setPosition({
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width
        });
    }
};

// Desktop position update
useEffect(() => {
    if (!isMobile && showDropdown && dropdownRef.current) {
        updateDropdownPosition(dropdownRef, setDropdownPosition);
    }
}, [showDropdown, isMobile]);

// Scroll handler (mobile only)
useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
        setShowDropdown(false);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Also listen to scrollable container if in modal
    const scrollableContainer = scrollableContainerRef?.current;
    if (scrollableContainer) {
        scrollableContainer.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
        window.removeEventListener('scroll', handleScroll);
        if (scrollableContainer) {
            scrollableContainer.removeEventListener('scroll', handleScroll);
        }
    };
}, [isMobile]);

// Click outside
useEffect(() => {
    const handleClickOutside = (event) => {
        if (!event.target.closest('.custom-dropdown')) {
            setShowDropdown(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);

// onClick handler
<div
    className="custom-dropdown-select"
    onClick={() => {
        if (!showDropdown && isMobile && dropdownRef.current) {
            // Calculate position BEFORE opening on mobile
            updateDropdownPosition(dropdownRef, setDropdownPosition);
        }
        setShowDropdown(!showDropdown);
    }}
>
    {/* content */}
</div>

{showDropdown && (
    <div
        className="custom-dropdown-menu"
        style={isMobile ? {
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
        } : {}}
    >
        {/* options */}
    </div>
)}
```

### CSS Pattern

```css
/* Desktop */
.custom-dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    background: white;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    max-height: 250px;
    overflow-y: auto;
    overflow-x: hidden;
    z-index: 900; /* Below footer (1000) and navbar (1010) */
}

/* Footer */
.footer,
.modal-footer {
    z-index: 1000 !important; /* Above dropdowns (900) */
}

/* Mobile */
@media (max-width: 768px) {
    .form-group {
        overflow: visible !important;
    }
    
    .form-group.dropdown-open {
        z-index: 902 !important;
        overflow: visible !important;
    }
    
    .custom-dropdown.dropdown-open {
        z-index: 903 !important;
    }
    
    .custom-dropdown-menu {
        z-index: 900 !important;
        position: fixed !important;
        overflow-y: auto;
        overflow-x: hidden;
    }
    
    /* Parent containers */
    .section,
    .form-grid,
    .modal-body {
        overflow: visible; /* For dropdowns */
        overflow-y: auto; /* For scrolling */
        overflow-x: hidden;
    }
}
```

## Important Notes

1. **Always test on mobile** - Dropdown behavior is critical on mobile devices
2. **Modal scroll handling** - If dropdowns are inside a modal, listen to modal body scroll, not just window scroll
3. **Z-index consistency** - Maintain the same z-index hierarchy across all screens
4. **Performance** - Use `{ passive: true }` for scroll event listeners
5. **Blinking prevention** - Always calculate position synchronously before opening on mobile

