import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180,
        height: 180,
        borderRadius: '40px',
        background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width="100"
        height="122"
        viewBox="0 0 18 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9 0C5.13 0 2 3.13 2 7c0 5.25 7 15 7 15s7-9.75 7-15c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S7.62 4.5 9 4.5s2.5 1.12 2.5 2.5S10.38 9.5 9 9.5z"
          fill="white"
        />
      </svg>
    </div>,
    { ...size }
  );
}
