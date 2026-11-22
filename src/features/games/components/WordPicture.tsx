import React from 'react';
import { Image, StyleSheet, Text } from 'react-native';

import { packAsset, type Word } from '@/content';

/** The word's picture: bundled image, else the draft placeholder emoji, else nothing. */
export function WordPicture({ packId, word, size }: { packId: string; word: Word; size: number }) {
  const image = packAsset(packId, word.image);
  if (image !== undefined) {
    return (
      <Image
        source={image}
        style={[styles.image, { width: size, height: size }]}
        accessible={false}
      />
    );
  }
  if (word.placeholderEmoji) {
    return <Text style={{ fontSize: size * 0.75, lineHeight: size }}>{word.placeholderEmoji}</Text>;
  }
  return null;
}

const styles = StyleSheet.create({ image: { resizeMode: 'contain' } });
