/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#005F02",
                "primary-light": "#427A43",
                accent: "#C0B87A",
                "bg-cream": "#F2E3BB",
            }
        },
    },
    plugins: [],
}
