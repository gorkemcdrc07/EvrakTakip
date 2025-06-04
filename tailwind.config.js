// tailwind.config.js
module.exports = {
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    darkMode: 'class',
    theme: {
        extend: {
            keyframes: {
                swing: {
                    '0%': { transform: 'rotateY(0deg)' },
                    '25%': { transform: 'rotateY(20deg)' },
                    '50%': { transform: 'rotateY(0deg)' },
                    '75%': { transform: 'rotateY(-20deg)' },
                    '100%': { transform: 'rotateY(0deg)' },
                },
            },
            animation: {
                swing: 'swing 3s ease-in-out infinite',
            },
        },
    },
    plugins: [],
};
