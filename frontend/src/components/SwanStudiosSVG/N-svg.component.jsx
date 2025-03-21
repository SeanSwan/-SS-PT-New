import React from 'react';
import { AnimatedPath } from './svg-sharedStyles';

const SvgLetter = ({ children, ...props }) => (
  <svg {...props}>
    {children}
  </svg>
);

const LetterN = ({ colors }) => (
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
        <path fill="#00457C" d="M158,196.1c-8.3,0-14.1-2.9-17.2-8.5l-28-51v48.7c0,2.5-0.9,5.9-5.3,8.3c-3,1.6-6.6,2.5-10.7,2.5
	c-4.1,0-7.7-0.8-10.7-2.5c-4.3-2.4-5.3-5.8-5.3-8.3V76.1c0-2.5,0.9-5.9,5.3-8.3c3-1.6,6.6-2.5,10.7-2.5c5.7,0,9.8,0.8,12.7,2.6
	c2.9,1.8,5.9,5.7,9.3,12.2l23.1,44.1V75.9c0-2.5,0.9-6,5.3-8.2c3-1.6,6.6-2.3,10.6-2.3c4.1,0,7.6,0.8,10.6,2.3
	c4.4,2.3,5.3,5.7,5.3,8.2v109.4c0,2.5-0.9,5.9-5.3,8.3C165.7,195.2,162.1,196.1,158,196.1z M110.4,124.3c0.9,0,1.7,0.5,2.2,1.3
	l32.7,59.5c2.2,4,6.4,5.9,12.8,5.9c3.2,0,6-0.6,8.3-1.8c2.3-1.3,2.7-2.8,2.7-3.9V75.9c0-1.1-0.3-2.6-2.6-3.8
	c-2.3-1.2-5.1-1.8-8.3-1.8c-3.2,0-6,0.6-8.3,1.8c-2.3,1.2-2.6,2.7-2.6,3.8v58.5c0,1.2-0.8,2.2-1.9,2.4c-1.1,0.3-2.3-0.2-2.8-1.3
	l-27.9-53.1c-3.6-6.9-6-9.3-7.4-10.2c-2.1-1.2-5.5-1.9-10.1-1.9c-3.2,0-6,0.6-8.3,1.8c-2.3,1.3-2.7,2.8-2.7,3.9v109.2
	c0,1.2,0.3,2.6,2.6,3.9c2.3,1.2,5,1.8,8.3,1.8c3.2,0,6-0.6,8.3-1.8c2.3-1.3,2.6-2.8,2.6-3.9v-58.5c0-1.1,0.8-2.1,1.9-2.4
	C110,124.3,110.2,124.3,110.4,124.3z"/>
<circle fill="none" cx="53.5" cy="166.1" r="2.7"/>
<path fill="#00457C" d="M117.3,213.3V213c0-1.5-1.2-2.6-2.6-2.6h-4.5v-4.5c0-1.5-1.2-2.6-2.6-2.6h-0.2c-1.5,0-2.6,1.2-2.6,2.6v4.5
	h-4.5c-1.5,0-2.6,1.2-2.6,2.6v0.2c0,1.5,1.2,2.6,2.6,2.6h4.5v4.5c0,1.5,1.2,2.6,2.6,2.6h0.2c1.5,0,2.6-1.2,2.6-2.6v-4.5h4.5
	C116.1,215.9,117.3,214.7,117.3,213.3z"/>
<path fill="#00457C" d="M53.5,157.8c-4.5,0-8.2,3.7-8.2,8.2s3.7,8.2,8.2,8.2c4.5,0,8.2-3.7,8.2-8.2S58.1,157.8,53.5,157.8z
	 M53.5,168.8c-1.5,0-2.7-1.2-2.7-2.7s1.2-2.7,2.7-2.7c1.5,0,2.7,1.2,2.7,2.7S55,168.8,53.5,168.8z"/>
<path fill="#00457C" d="M73.5,111v-0.2c0-1.5-1.2-2.6-2.6-2.6H23.3c-1.5,0-2.6,1.2-2.6,2.6v0.2c0,1.5,1.2,2.6,2.6,2.6h47.5
	C72.3,113.6,73.5,112.4,73.5,111z"/>
<path fill="#00457C" d="M56.9,98.5h6.4c1.5,0,2.6-1.2,2.6-2.6v-0.2c0-1.5-1.2-2.6-2.6-2.6h-6.4c-1.5,0-2.6,1.2-2.6,2.6v0.2
	C54.3,97.3,55.4,98.5,56.9,98.5z"/>
<path fill="#00457C" d="M42.5,122.5c-1.5,0-2.6,1.2-2.6,2.6v0.2c0,1.5,1.2,2.6,2.6,2.6h9.1c1.5,0,2.6-1.2,2.6-2.6v-0.2
	c0-1.5-1.2-2.6-2.6-2.6H42.5z"/>
<path fill="#00457C" d="M112.6,139.5L112.6,139.5c0-1.3-0.9-2.4-2.2-2.6v5.2C111.6,141.9,112.6,140.8,112.6,139.5z"/>
      </SvgLetter>
    ))}
  </>
);

export default LetterN;