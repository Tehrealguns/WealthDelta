import type { Variants } from 'framer-motion';

export const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 1.2, delay: i * 0.1, ease },
  }),
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number) => ({
    opacity: 1,
    transition: { duration: 1.4, delay: i * 0.08, ease },
  }),
};

export const cardMorph: Variants = {
  hidden: (i: number) => {
    const directions = [
      { x: -40, y: 30, rotateY: 6 },
      { x: 0, y: 45, rotateY: 0 },
      { x: 40, y: 30, rotateY: -6 },
      { x: -30, y: 20, rotateY: 4 },
      { x: 25, y: 35, rotateY: -5 },
      { x: 35, y: -15, rotateY: -4 },
    ];
    const d = directions[i % directions.length];
    return {
      opacity: 0,
      x: d.x,
      y: d.y,
      scale: 0.92,
      rotateY: d.rotateY,
    };
  },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    rotateY: 0,
    transition: {
      duration: 1.4,
      delay: 0.05 + i * 0.12,
      ease,
    },
  }),
};

export const slideLeft: Variants = {
  hidden: { opacity: 0, x: -50 },
  visible: {
    opacity: 1, x: 0,
    transition: { duration: 1.3, ease },
  },
};

export const slideRight: Variants = {
  hidden: { opacity: 0, x: 50 },
  visible: {
    opacity: 1, x: 0,
    transition: { duration: 1.3, ease },
  },
};

export const vp = { once: true, margin: '-60px' as `${number}px`, amount: 0.15 };
