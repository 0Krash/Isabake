import fs from 'fs';
import path from 'path';

import { getIcon, iconManifest, iconSvgs } from '../../assets/icons/registry';

describe('AppIcon registry', () => {
  test('registers local SVGRepo icons with safe metadata and XML', () => {
    expect(iconManifest.length).toBeGreaterThanOrEqual(6);

    for (const icon of iconManifest) {
      expect(icon.name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(icon.path).toMatch(/^assets\/icons\/.+\.svg$/);
      expect(icon.sourceUrl).toMatch(/^https:\/\/www\.svgrepo\.com\/svg\/\d+\//);
      expect(icon.license).toBeTruthy();
      expect(icon.originalName).toBeTruthy();
      expect(getIcon(icon.name)).toEqual(icon);

      const absolutePath = path.join(__dirname, '..', '..', icon.path);
      const svg = fs.readFileSync(absolutePath, 'utf8');

      expect(svg).toContain('<svg');
      expect(svg).toMatch(/viewBox=/);
      expect(svg).not.toMatch(/<script/i);
      expect(svg.match(/^<svg\b[^>]*>/i)?.[0] || '').not.toMatch(
        /\s(width|height)=["']/i,
      );
      expect(iconSvgs[icon.name]).toBe(svg);
    }
  });
});
