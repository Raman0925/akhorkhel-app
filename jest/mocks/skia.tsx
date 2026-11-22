/** Light manual mock of @shopify/react-native-skia for screen tests (no GPU, no CanvasKit). */
import React, { type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

const Passthrough = ({ children }: { children?: ReactNode }) => <>{children}</>;
const Nothing = () => null;

export const Canvas = ({ children, ...rest }: ViewProps & { children?: ReactNode }) => (
  <View {...rest}>{children}</View>
);
export const Group = Passthrough;
export const Path = Nothing;
export const Circle = Nothing;
export const Line = Nothing;
export const Rect = Nothing;
export const RoundedRect = Nothing;
export const Text = Nothing;
export const DashPathEffect = Nothing;
export const Paint = Nothing;
export const vec = (x: number, y: number) => ({ x, y });

const makePath = () => {
  const path = {
    moveTo: () => path,
    lineTo: () => path,
    quadTo: () => path,
    close: () => path,
    reset: () => path,
    addCircle: () => path,
    transform: () => path,
    copy: () => makePath(),
    toSVGString: () => '',
    computeTightBounds: () => ({ x: 0, y: 0, width: 1, height: 1 }),
    contains: () => false,
  };
  return path;
};

export const Skia = {
  Path: { Make: makePath, MakeFromSVGString: () => makePath() },
  Matrix: () => ({ translate: () => undefined, scale: () => undefined }),
  Color: (c: string) => c,
};

export const usePathValue = () => makePath();
export const notifyChange = () => undefined;
export const useFont = () => null;
export const matchFont = () => null;
