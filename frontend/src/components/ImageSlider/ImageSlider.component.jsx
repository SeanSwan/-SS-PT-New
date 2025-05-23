import React, { useState, useEffect } from 'react';
import styled from 'styled-components';


const ImageSliderContainer = styled.div`
  position: relative;
  width: 100vw;
  height: 60vw;
  max-height: 450px;
  overflow: hidden;

  @media (max-width: 767px) {
    height: 50vw;
  }
`;

const ImageContainer = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  transform: translateX(${(props) => (props.active ? '0' : '-100%')});
  transition: transform ${(props) => props.transitionDuration}ms ${(props) => props.transitionEffect};
`;

const ImageSlider = ({
  images,
  transitionEffect = 'ease-in-out',
  transitionDuration = 1000,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((currentIndex) => (currentIndex + 1) % images.length);
    }, 5000 + transitionDuration); // Add transitionDuration to wait for the transition to complete
    return () => clearInterval(interval);
  }, [images, transitionDuration]);

  return (
    <ImageSliderContainer>
      {images.map((image, index) => (
        <ImageContainer
          key={image}
          active={index === currentImageIndex}
          transitionEffect={transitionEffect}
          transitionDuration={transitionDuration}
        >
          <ResizeImage src={image} alt={`Image ${index + 1}`} className="slider-image" />
        </ImageContainer>
      ))}
    </ImageSliderContainer>
  );
};

export default ImageSlider;




/*NOTES:
  This is my imageslider currently the width is 100vw but now the pictures in the image slider are not showing the full picture on some what size pictures do i need to creast or to convert to get those pics to the correct size can you give me some options to fix this issue?

It sounds like your image slider is displaying images at the full width of the viewport (100vw), but the aspect ratios of your images might be causing them to be cropped or not displayed correctly. Here are a few options to help you fix this issue:

    Maintain aspect ratio with CSS:
    To display the full image without cropping, you can use CSS to maintain the aspect ratio of the images. Add these styles to your image slider:

css

.slider-image {
  object-fit: contain; /* Preserve aspect ratio 
  max-height: 100%; /* Restrict height to fit within container 
  width: 100vw; /* Set width to 100vw 
}

    Crop or resize images:
    Determine the desired aspect ratio for your image slider, and resize or crop your images accordingly. For example, if you want a 16:9 aspect ratio, calculate the height as 56.25vw (100vw * 9 / 16). Then, edit your images to have the same 16:9 aspect ratio, and set the image slider dimensions in your CSS:

css

.slider-container {
  width: 100vw;
  height: 56.25vw;
  overflow: hidden;
}

.slider-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

    Use responsive image breakpoints:
    If you want to optimize your images for different screen
     sizes, create multiple versions of your images with 
     different widths and heights. Use the HTML srcset attribute
      and CSS media queries to load the appropriate image based
       on the screen size. For example:

html

<img src="image-small.jpg"
     srcset="image-small.jpg 480w,
             image-medium.jpg 768w,
             image-large.jpg 1024w"
     sizes="(max-width: 480px) 480w,
            (max-width: 768px) 768w,
            1024w"
     alt="Image description"
     class="slider-image">

css

.slider-image {
  width: 100%;
  height: auto; // Maintain aspect ratio 
  object-fit: contain;
}

In summary, you can maintain the aspect ratio with CSS, 
crop or resize images, or use responsive image breakpoints 
to ensure that your images are displayed correctly in the 
image slider. Depending on your specific requirements 
and website design, one or more of these solutions 
may be suitable for your project. */
