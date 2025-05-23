import React, { useState, useEffect, useRef } from "react";
import './resize-image.styles.css'; // Import the CSS styles

function ResizeImage(props) {
  const [dimensions, setDimensions] = useState(null);
  const imageRef = useRef(null);

  useEffect(() => {
    const resizeHandler = () => {
      if (imageRef.current) {
        const containerWidth = imageRef.current.parentNode.offsetWidth;
        const containerHeight = imageRef.current.parentNode.offsetHeight;
        const aspectRatio = dimensions.width / dimensions.height;
        const containerAspectRatio = containerWidth / containerHeight;

        if (aspectRatio > containerAspectRatio) {
          // image is wider than container, adjust height
          const newHeight = containerWidth / aspectRatio;
          setDimensions({ width: containerWidth, height: newHeight });
        } else {
          // image is taller than container, adjust width
          const newWidth = containerHeight * aspectRatio;
          setDimensions({ width: newWidth, height: containerHeight });
        }
      }
    };

    if (dimensions) {
      window.addEventListener("resize", resizeHandler);
    }

    return () => {
      if (dimensions) {
        window.removeEventListener("resize", resizeHandler);
      }
    };
  }, [dimensions]);

  const onLoad = (e) => {
    setDimensions({ width: e.target.naturalWidth, height: e.target.naturalHeight });
  };

  const { src, alt, className } = props;
  return (
    <img
      ref={imageRef}
      src={src}
      alt={alt}
      className={`slider-image ${className}`} // Add the 'slider-image' class
      onLoad={onLoad} // Call the onLoad function when the image has loaded
      style={dimensions ? { width: dimensions.width, height: dimensions.height } : {}}
    />
  );
}

export default ResizeImage;