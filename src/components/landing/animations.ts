import type { Variants } from 'framer-motion';

export const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 1, delay: i * 0.12, ease },
  }),
};

export const fadeIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.9, delay: i * 0.1, ease },
  }),
};

export const cardMorph: Variants = {
  hidden: (i: number) => {
    const directions = [
      { x: -120, y: 60, rotateY: 25, rotateX: -10 },
      { x: 0, y: 100, rotateY: 0, rotateX: 15 },
      { x: 120, y: 60, rotateY: -25, rotateX: -10 },
      { x: -80, y: 40, rotateY: 15, rotateX: 8 },
      { x: 60, y: 80, rotateY: -20, rotateX: -12 },
      { x: 100, y: -40, rotateY: -15, rotateX: 10 },
    ];
    const d = directions[i % directions.length];
    return {
      opacity: 0,
      x: d.x,
      y: d.y,
      scale: 0.4,
      rotateY: d.rotateY,
      rotateX: d.rotateX,
      filter: 'blur(8px)',
    };
  },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    rotateY: 0,
    rotateX: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 1,
      delay: 0.1 + i * 0.15,
      ease,
    },
  }),
};

export const slideLeft: Variants = {
  hidden: { opacity: 0, x: -80, rotateY: 8, scale: 0.92 },
  visible: {
    opacity: 1, x: 0, rotateY: 0, scale: 1,
    transition: { duration: 1, ease },
  },
};

export const slideRight: Variants = {
  hidden: { opacity: 0, x: 80, rotateY: -8, scale: 0.92 },
  visible: {
    opacity: 1, x: 0, rotateY: 0, scale: 1,
    transition: { duration: 1, ease },
  },
};

export const vp = { once: true, margin: '-80px' as `${number}px`, amount: 0.2 };
