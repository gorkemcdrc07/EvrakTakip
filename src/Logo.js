import React from 'react';
import { ReactComponent as LogoSVG } from './assets/logo.svg';

function Logo({ color = 'black', width = '100%', height = '100%', className = '' }) {
    return (
        <div
            style={{ color, width, height }}
            className={`[transform-style:preserve-3d] ${className}`}
        >
            <LogoSVG className="w-full h-full fill-current [backface-visibility:hidden]" />
        </div>
    );
}

export default Logo;
