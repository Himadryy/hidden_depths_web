'use client';

import React, { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle, Vec2 } from 'ogl';
import { usePerformance } from '@/hooks/usePerformance';
import { useTheme } from '@/context/ThemeProvider';

const vertexShader = `#version 300 es
in vec2 position;
void main() {
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform int uTier; // 0: LOW, 1: MID, 2: ULTRA
uniform float uIsDark; // 0.0 = Light, 1.0 = Dark

out vec4 fragColor;

// Voronoi noise functions (by Inigo Quilez)
vec2 hash( vec2 p ) {
	p = vec2( dot(p,vec2(127.1,311.7)),
			  dot(p,vec2(269.5,183.3)) );
	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

float voronoi( in vec2 x ) {
    vec2 n = floor( x );
    vec2 f = fract( x );

    float F1 = 8.0;
    float F2 = 8.0;

    for( int j=-1; j<=1; j++ )
    for( int i=-1; i<=1; i++ ) {
        vec2 g = vec2( float(i), float(j) );
        vec2 o = hash( n + g );
		vec2 r = g - f + o;

		float d = dot(r,r);
        if( d<F1 ) { 
            F2 = F1; 
            F1 = d; 
        } else if( d<F2 ) {
            F2 = d;
        }
    }
    
    return F2;
}

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    
    // Animate and scale the noise
    float time = uTime * 0.05;
    vec2 p = uv * (2.0 + 1.0 * float(uTier)); // Higher tier gets more detail
    p.x -= time;
    p.y += sin(time) * 0.2;

    float v = voronoi(p * 6.0); // Base pattern
    
    // Layered noise for complexity (if not on LOW tier)
    if (uTier > 0) {
        float time2 = uTime * 0.08;
        vec2 p2 = uv * 3.0;
        p2.x += time2;
        p2.y -= sin(time2) * 0.1;
        v += voronoi(p2 * 8.0) * 0.4;
    }

    // Process the noise to look like caustics
    v = 1.0 - v;
    v = pow(v, 4.0);
    
    // Mouse interaction - subtle liquid distortion
    float dist = length(uv - uMouse);
    float ripple = smoothstep(0.2, 0.0, dist) * 0.05;
    v += ripple;

    // --- THEME COLORS ---
    
    // Light Mode (Morning Light)
    vec3 lightBase = vec3(0.97, 0.98, 1.0);
    vec3 lightCaustic = vec3(1.0, 0.95, 0.85); // Pale Gold
    
    // Dark Mode (Abyssal Light)
    vec3 darkBase = vec3(0.05, 0.05, 0.08); // Deep Void
    vec3 darkCaustic = vec3(0.2, 0.3, 0.5); // Deep Blue/Indigo Caustics

    // Mix based on Theme
    vec3 baseCol = mix(lightBase, darkBase, uIsDark);
    vec3 causticCol = mix(lightCaustic, darkCaustic, uIsDark);

    vec3 col = mix(baseCol, causticCol, v * 0.5);

    // Subtle vignette in corners
    float d = length(uv - 0.5);
    vec3 vignetteColor = mix(vec3(0.9, 0.95, 1.0), vec3(0.02, 0.02, 0.05), uIsDark);
    col = mix(col, vignetteColor, d * 0.3);

    fragColor = vec4(col, 1.0);
}
`;

const CausticOcean = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { tier, isLoaded } = usePerformance();
  const { theme } = useTheme();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isLoaded || tier === 'DETECTING') return;

    let dpr = 1.0;
    if (tier === 'ULTRA') dpr = 1.0;
    else if (tier === 'MID') dpr = 0.8;
    else dpr = 0.5; // Aggressive downsampling on LOW

    const renderer = new Renderer({ dpr, alpha: true, antialias: false, depth: false });
    const { gl } = renderer;
    container.appendChild(gl.canvas);
    gl.canvas.style.position = 'absolute';
    gl.canvas.style.inset = '0';
    gl.canvas.style.width = '100%';
    gl.canvas.style.height = '100%';

    const mouse = new Vec2(0.5, 0.5);

    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [gl.drawingBufferWidth, gl.drawingBufferHeight] },
        uMouse: { value: mouse },
        uTier: { value: tier === 'ULTRA' ? 2 : tier === 'MID' ? 1 : 0 },
        uIsDark: { value: theme === 'dark' ? 1.0 : 0.0 }, // Initialize
      },
    });

    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    const resize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
      program.uniforms.uResolution.value = [gl.drawingBufferWidth, gl.drawingBufferHeight];
    };
    window.addEventListener('resize', resize, false);
    resize();
    
    const onPointerMove = (e: PointerEvent) => {
        mouse.set(e.clientX / gl.canvas.width, 1.0 - e.clientY / gl.canvas.height);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    let rafId: number;
    // Animation for smooth theme transition
    let currentDarkVal = theme === 'dark' ? 1.0 : 0.0;
    
    const update = (t: number) => {
      rafId = requestAnimationFrame(update);
      program.uniforms.uTime.value = t * 0.001;
      
      // Smoothly interpolate theme transition in shader
      const targetDark = theme === 'dark' ? 1.0 : 0.0;
      currentDarkVal += (targetDark - currentDarkVal) * 0.05; // Ease in
      program.uniforms.uIsDark.value = currentDarkVal;

      renderer.render({ scene: mesh });
    };
    rafId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      cancelAnimationFrame(rafId);
      container.removeChild(gl.canvas);
    };
  }, [tier, isLoaded, theme]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full -z-10" />;
};

export default CausticOcean;