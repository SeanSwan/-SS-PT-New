/**
 * Animation Effects for Swan Studios Website
 * Adds scroll-based animations and microinteractions
 */

// Function to handle fade-in animations on scroll
function handleScrollAnimations() {
  const fadeInSections = document.querySelectorAll('section');
  
  // Create an observer for scroll animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      // Add 'is-visible' class when element comes into view
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in-section');
        entry.target.classList.add('is-visible');
        
        // Unobserve after animation to improve performance
        // observer.unobserve(entry.target);
      }
    });
  }, {
    root: null, // viewport
    threshold: 0.15, // 15% of element must be visible
    rootMargin: '0px 0px -50px 0px' // Slightly before element comes into view
  });
  
  // Observe all sections
  fadeInSections.forEach(section => {
    observer.observe(section);
  });
}

// Function to add header scroll effect
function handleHeaderScroll() {
  const header = document.querySelector('header');
  
  if (!header) return;
  
  // Add scroll event listener
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

// Function to add hover effects to buttons
function addButtonEffects() {
  const buttons = document.querySelectorAll('.btn, button:not(.icon-button), .GlowButton');
  
  buttons.forEach(button => {
    // Add shine effect on hover
    button.addEventListener('mouseenter', () => {
      button.classList.add('hover');
    });
    
    button.addEventListener('mouseleave', () => {
      button.classList.remove('hover');
    });
  });
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize animations
  handleScrollAnimations();
  handleHeaderScroll();
  addButtonEffects();
  
  // Add any additional animation effects here
});

// Add smooth scrolling to anchor links
document.addEventListener('click', (event) => {
  const target = event.target;
  
  // Check if clicked element is an anchor link
  if (target.tagName === 'A' && target.getAttribute('href') && target.getAttribute('href').startsWith('#')) {
    const targetId = target.getAttribute('href');
    const targetElement = document.querySelector(targetId);
    
    if (targetElement) {
      event.preventDefault();
      
      // Smooth scroll to target
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      
      // Update URL without page reload
      history.pushState(null, '', targetId);
    }
  }
});
