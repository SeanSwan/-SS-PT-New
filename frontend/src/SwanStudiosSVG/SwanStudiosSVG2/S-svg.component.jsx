import React from 'react';
import { AnimatedPath } from './svg-sharedStyles';

const SvgLetter = ({ children, ...props }) => (
  <svg {...props}>
    {children}
  </svg>
);

const LetterS = ({ colors }) => (
  <>
    {colors.map((color, index) => (
      <SvgLetter
        key={index}
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        width="100%"
        viewBox="0 0 255 255"
        preserveAspectRatio="xMidYMid meet"
      >
        <AnimatedPath
          d="M126.4,197.8c-11.5,0-21.7-2.4-30.3-7.2c-9.1-5-13.7-11-13.7-17.7c0-3.7,1.3-7.5,4-11.1"
          fill={color === 'hot pink' ? color : 'none'}
          strokeColor={color}
        />
        <polygon fill="none" points="127.4,100.3 125.2,108.5 129.7,108.5 "/>
       <path fill="#0045m 7C" d="M126.4,197.8c-11.5,0-21.7-2.4-30.3-7.2c-9.1-5-13.7-11-13.7-17.7c0-3.7,1.3-7.5,4-11.1
	c2.8-3.9,6.3-5.8,10.2-5.8c2.2,0,4.6,0.8,7.1,2.5c2.2,1.5,4.3,3.1,6.2,4.9c1.6,1.5,3.8,2.9,6.8,4.1c2.9,1.2,6,1.9,9.2,1.9
	c4,0,7.5-0.8,10.5-2.5c2.5-1.4,3.7-3.5,3.7-6.3c0-3-1.5-5.6-4.6-8c-3.6-2.7-8-5.3-13.1-7.5c-5.4-2.4-10.8-5.1-16.3-8
	c-5.7-3.1-10.6-7.6-14.5-13.2c-4-5.8-6-12.7-6-20.7c0-13,4.7-22.8,14-29.3c9-6.3,19.9-9.5,32.6-9.5c3.1,0,6.3,0.2,9.6,0.5
	c3.4,0.4,7.2,1.1,11.3,2.1c4.4,1.1,8.1,2.9,11,5.4c3.1,2.7,4.7,6.1,4.7,10c0,3.5-1.1,7.1-3.2,10.7c-2.3,4-5.8,6.1-10,6.1
	c-1.2,0-3.5-0.4-9.9-3.5c-4.1-2-8.7-3-13.7-3c-5.2,0-9,0.9-11.5,2.6c-2.9,2-3.2,4-3.2,5.3c0,1.9,1,3.6,3.1,5.3
	c2.5,2,5.6,3.8,9.4,5.2c4.1,1.6,8.6,3.6,13.4,6.1c4.9,2.5,9.4,5.3,13.5,8.3c4.3,3.1,8,7.6,10.8,13.2c2.9,5.6,4.3,12.1,4.3,19.2
	c0,12.5-4.3,22.5-12.8,29.5C150.8,194.3,139.8,197.8,126.4,197.8z M96.6,161c-2.3,0-4.3,1.2-6.2,3.8c-2,2.8-3,5.5-3,8.2
	c0,4.7,3.7,9.2,11.1,13.3c7.8,4.4,17.2,6.6,27.9,6.6c12.2,0,22.1-3.1,29.5-9.3c7.4-6.1,11-14.5,11-25.7c0-6.3-1.3-12-3.8-16.9
	c-2.5-4.9-5.6-8.7-9.3-11.4c-3.9-2.8-8.2-5.5-12.8-7.9c-4.7-2.4-9-4.4-12.9-5.9c-4.2-1.6-7.9-3.6-10.7-6c-3.3-2.7-5-5.7-5-9.2
	c0-3.7,1.8-6.9,5.4-9.4c3.3-2.3,8-3.5,14.3-3.5c5.7,0,11.1,1.2,15.9,3.5c5.9,2.9,7.4,3,7.7,3c2.4,0,4.2-1.2,5.7-3.6
	c1.7-2.9,2.5-5.6,2.5-8.2c0-2.5-1-4.5-3-6.3c-2.3-2-5.3-3.4-8.9-4.3c-3.9-1-7.5-1.6-10.7-2c-3.2-0.3-6.2-0.5-9.1-0.5
	c-11.6,0-21.6,2.9-29.7,8.6c-8,5.6-11.8,13.8-11.8,25.2c0,6.9,1.7,12.9,5.1,17.8c3.5,5,7.8,9,12.8,11.7c5.3,2.9,10.7,5.5,15.9,7.8
	c5.5,2.4,10.2,5.2,14.1,8.1c4.4,3.4,6.6,7.4,6.6,12c0,4.7-2.2,8.4-6.3,10.7c-3.7,2.1-8,3.2-12.9,3.2c-3.9,0-7.6-0.8-11.1-2.3
	c-3.5-1.5-6.2-3.2-8.2-5.1c-1.7-1.6-3.5-3-5.5-4.3C99.3,161.5,97.8,161,96.6,161z"/>
<path fill="#00457C" d="M129.6,146.6h1.4c-1.3-0.7-2.6-1.5-4-2.2C127.3,145.7,128.3,146.6,129.6,146.6z"/>
<path fill="#00457C" d="M173.1,146.6c1.5,0,2.6-1.2,2.6-2.6v-0.2c0-1.5-1.2-2.6-2.6-2.6H166c0.8,1.8,1.4,3.6,2,5.5H173.1z"/>
<path fill="#00457C" d="M189.4,144c0,1.5,1.2,2.6,2.6,2.6h11.2c1.5,0,2.6-1.2,2.6-2.6v-0.2c0-1.5-1.2-2.6-2.6-2.6h-11.2
	c-1.5,0-2.6,1.2-2.6,2.6V144z"/>
<path fill="#00457C" d="M232.7,156.2H203c-1.5,0-2.6,1.2-2.6,2.6v0.2c0,1.5,1.2,2.6,2.6,2.6h29.7c1.5,0,2.6-1.2,2.6-2.6v-0.2
	C235.4,157.4,234.2,156.2,232.7,156.2z"/>
<path fill="#00457C" d="M173,158.9v0.2c0,1.5,1.2,2.6,2.6,2.6h7.1c1.5,0,2.6-1.2,2.6-2.6v-0.2c0-1.5-1.2-2.6-2.6-2.6h-7.1
	C174.1,156.2,173,157.4,173,158.9z"/>
<path fill="#00457C" d="M177.2,177.5c1.5,0,2.6-1.2,2.6-2.6v-0.2c0-1.5-1.2-2.6-2.6-2.6H167c-0.7,1.9-1.6,3.8-2.7,5.5H177.2z"/>
<line fill="none" stroke="#00457C" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round" x1="170.4" y1="113.1" x2="170.4" y2="113.1"/>
<path fill="#00457C" d="M173,115.9h4.5v4.5c0,1.5,1.2,2.6,2.6,2.6h0.2c1.5,0,2.6-1.2,2.6-2.6v-4.5h4.5c1.5,0,2.6-1.2,2.6-2.6V113
	c0-1.5-1.2-2.6-2.6-2.6H183v-4.5c0-1.5-1.2-2.6-2.6-2.6h-0.2c-1.5,0-2.6,1.2-2.6,2.6v4.5H173c-1.5,0-2.6,1.2-2.6,2.6v0.1v0.1
	C170.4,114.7,171.6,115.9,173,115.9z"/>
      </SvgLetter>
    ))}
  </>
);

export default LetterS;