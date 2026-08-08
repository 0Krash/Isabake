import React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { getIcon, iconSvgs } from '../../assets/icons/registry';

export default function AppIcon({
  accessibilityLabel,
  color = 'currentColor',
  decorative = false,
  disabled = false,
  height,
  name,
  size = 24,
  style,
  width,
}) {
  const icon = getIcon(name);
  const xml = icon ? iconSvgs[name] : null;
  const resolvedWidth = width || size;
  const resolvedHeight = height || size;
  const resolvedColor = disabled ? '#8E879F' : color;

  if (!xml) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[
          {
            height: resolvedHeight,
            width: resolvedWidth,
          },
          style,
        ]}
      />
    );
  }

  return (
    <SvgXml
      accessibilityLabel={decorative ? undefined : accessibilityLabel}
      accessibilityRole={decorative ? undefined : 'image'}
      accessible={!decorative && Boolean(accessibilityLabel)}
      color={resolvedColor}
      height={resolvedHeight}
      importantForAccessibility={decorative ? 'no' : 'auto'}
      style={style}
      width={resolvedWidth}
      xml={xml}
    />
  );
}
