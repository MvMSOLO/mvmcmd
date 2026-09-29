package com.mvmcmd.launcher;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public final class MvmWallpaperCatalog {
    public static final class Spec {
        public final String id;
        public final String title;
        public final String asset;
        public final String style; // "ghost", "stack", "clean", "outline", "ring", "left", "right"
        public final float focusX, focusY, depth, drift;
        public final float clockX, clockY, clockSize;
        public final float dateX, dateY, dateSize;
        public final int clockColor, dateColor, accentColor;
        public final android.graphics.Paint.Align align;

        Spec(String id, String title, String asset, String style,
             float fx, float fy, float depth, float drift,
             float cx, float cy, float cs, float dx, float dy, float ds,
             int cc, int dc, int ac, android.graphics.Paint.Align align) {
            this.id = id; this.title = title; this.asset = asset; this.style = style;
            this.focusX = fx; this.focusY = fy; this.depth = depth; this.drift = drift;
            this.clockX = cx; this.clockY = cy; this.clockSize = cs;
            this.dateX = dx; this.dateY = dy; this.dateSize = ds;
            this.clockColor = cc; this.dateColor = dc; this.accentColor = ac;
            this.align = align;
        }
    }

    private static int a(int alpha, int rgb) { return (alpha << 24) | (rgb & 0x00ffffff); }

    private static final List<Spec> ITEMS = Collections.unmodifiableList(Arrays.asList(
        // 1. Ice Eyes - Piercing ice cyan theme, clock top-right
        new Spec("ice_eyes", "Ice Eyes", "wallpapers/ice_eyes.png", "ghost",
            0.50f, 0.42f, 0.14f, 0.030f,
            0.88f, 0.18f, 0.170f, 0.88f, 0.28f, 0.030f,
            a(240, 0xebfaff), a(180, 0x8ce4ff), a(160, 0x00d8ff), android.graphics.Paint.Align.RIGHT),

        // 2. Scarlet Focus - Cyber Katana samurai theme, clock top-left vertical stack
        new Spec("scarlet_focus", "Scarlet Focus", "wallpapers/scarlet_focus.png", "stack",
            0.50f, 0.38f, 0.13f, 0.028f,
            0.12f, 0.18f, 0.165f, 0.12f, 0.29f, 0.029f,
            a(240, 0xfff0f2), a(180, 0xffa8b5), a(160, 0xff2244), android.graphics.Paint.Align.LEFT),

        // 3. Midnight BMW - Aggressive quad LED angel eyes, clock bottom left above headlights
        new Spec("midnight_bmw", "Midnight BMW", "wallpapers/midnight_bmw.png", "left",
            0.50f, 0.52f, 0.11f, 0.024f,
            0.12f, 0.45f, 0.155f, 0.12f, 0.36f, 0.028f,
            a(240, 0xf2f8ff), a(180, 0x9ecfff), a(150, 0x0090ff), android.graphics.Paint.Align.LEFT),

        // 4. Crimson Spider - Spidey lenses geometric web, centered outline clock
        new Spec("crimson_spider", "Crimson Spider", "wallpapers/crimson_spider.png", "outline",
            0.50f, 0.48f, 0.13f, 0.028f,
            0.50f, 0.20f, 0.175f, 0.50f, 0.11f, 0.030f,
            a(240, 0xfff2f4), a(180, 0xff8a99), a(160, 0xff1e38), android.graphics.Paint.Align.CENTER),

        // 5. Red Ronin - Cherry blossom glowing sword, centered ghost clock bottom
        new Spec("red_ronin", "Red Ronin", "wallpapers/red_ronin.png", "ghost",
            0.50f, 0.55f, 0.14f, 0.028f,
            0.50f, 0.85f, 0.165f, 0.50f, 0.74f, 0.028f,
            a(240, 0xffecec), a(180, 0xff9898), a(160, 0xff3348), android.graphics.Paint.Align.CENTER),

        // 6. Gotham Rain - Dark gothic skyline spotlight, top right clean clock
        new Spec("gotham_rain", "Gotham Rain", "wallpapers/gotham_rain.png", "clean",
            0.50f, 0.45f, 0.10f, 0.022f,
            0.88f, 0.22f, 0.155f, 0.88f, 0.32f, 0.028f,
            a(235, 0xf4f8fc), a(170, 0xafc8e0), a(140, 0x64a0dc), android.graphics.Paint.Align.RIGHT),

        // 7. Deep Space - Cosmic nebula starfield, top left left-aligned clock
        new Spec("deep_space", "Deep Space", "wallpapers/deep_space.png", "left",
            0.50f, 0.50f, 0.12f, 0.032f,
            0.12f, 0.20f, 0.160f, 0.12f, 0.30f, 0.028f,
            a(240, 0xf0f4ff), a(180, 0x92b6ff), a(150, 0x4880ff), android.graphics.Paint.Align.LEFT),

        // 8. Midnight P1 - McLaren sweeping LED arc, bottom left clock
        new Spec("midnight_p1", "Midnight P1", "wallpapers/midnight_p1.png", "left",
            0.50f, 0.52f, 0.11f, 0.025f,
            0.12f, 0.78f, 0.150f, 0.12f, 0.68f, 0.028f,
            a(240, 0xfff2f2), a(180, 0xffa0a0), a(150, 0xff2840), android.graphics.Paint.Align.LEFT),

        // 9. Amber Orbit - Golden planet & ring, orbital ring clock framing center
        new Spec("amber_orbit", "Amber Orbit", "wallpapers/amber_orbit.png", "ring",
            0.50f, 0.43f, 0.12f, 0.026f,
            0.50f, 0.22f, 0.160f, 0.50f, 0.33f, 0.028f,
            a(240, 0xfff8e8), a(180, 0xffcf80), a(160, 0xffa01a), android.graphics.Paint.Align.CENTER),

        // 10. Orbital Bloom - Sacred geometry mandala, ring clock
        new Spec("orbital_bloom", "Orbital Bloom", "wallpapers/orbital_bloom.png", "ring",
            0.50f, 0.47f, 0.12f, 0.026f,
            0.50f, 0.47f, 0.150f, 0.50f, 0.60f, 0.028f,
            a(240, 0xfffaed), a(180, 0xffdd94), a(160, 0xffb833), android.graphics.Paint.Align.CENTER),

        // 11. Moon Garden - Giant full moon & blossoms, top centered clean clock
        new Spec("moon_garden", "Moon Garden", "wallpapers/moon_garden.png", "clean",
            0.50f, 0.31f, 0.10f, 0.022f,
            0.50f, 0.31f, 0.165f, 0.50f, 0.20f, 0.030f,
            a(245, 0xfffdf5), a(180, 0xffe8b8), a(150, 0xffd070), android.graphics.Paint.Align.CENTER),

        // 12. Quiet Grove - Mystical forest sunbeams & fireflies, centered outline
        new Spec("quiet_grove", "Quiet Grove", "wallpapers/quiet_grove.png", "outline",
            0.50f, 0.58f, 0.11f, 0.024f,
            0.50f, 0.25f, 0.160f, 0.50f, 0.15f, 0.028f,
            a(235, 0xf0fdf2), a(170, 0xa3f0b0), a(150, 0x42d860), android.graphics.Paint.Align.CENTER),

        // 13. Silent Alps - Aurora borealis mountain peaks, top center outline clock
        new Spec("silent_alps", "Silent Alps", "wallpapers/silent_alps.png", "outline",
            0.50f, 0.50f, 0.09f, 0.018f,
            0.50f, 0.22f, 0.165f, 0.50f, 0.12f, 0.029f,
            a(240, 0xecfaef), a(180, 0x8ae8c0), a(150, 0x24d090), android.graphics.Paint.Align.CENTER),

        // 14. Azure Creek - Bioluminescent river, right aligned clock
        new Spec("azure_creek", "Azure Creek", "wallpapers/azure_creek.png", "right",
            0.50f, 0.55f, 0.12f, 0.026f,
            0.88f, 0.22f, 0.160f, 0.88f, 0.32f, 0.028f,
            a(240, 0xebfaff), a(180, 0x8adcff), a(150, 0x1ab8ff), android.graphics.Paint.Align.RIGHT),

        // 15. Starlit Field - Dandelion spores milky way, top center clock
        new Spec("starlit_field", "Starlit Field", "wallpapers/starlit_field.png", "outline",
            0.50f, 0.35f, 0.11f, 0.028f,
            0.50f, 0.22f, 0.160f, 0.50f, 0.12f, 0.028f,
            a(235, 0xf0f7ff), a(170, 0xa8d2ff), a(150, 0x4898ff), android.graphics.Paint.Align.CENTER),

        // 16. Fluid Signal - 3D iridescent liquid wave, clean centered clock
        new Spec("fluid_signal", "Fluid Signal", "wallpapers/fluid_signal.png", "clean",
            0.50f, 0.50f, 0.12f, 0.026f,
            0.50f, 0.25f, 0.160f, 0.50f, 0.36f, 0.028f,
            a(240, 0xf2f0ff), a(180, 0xbca8ff), a(150, 0x7848ff), android.graphics.Paint.Align.CENTER),

        // 17. Midnight Tree - Cosmic glowing tree, stack clock top center
        new Spec("midnight_tree", "Midnight Tree", "wallpapers/midnight_tree.png", "stack",
            0.50f, 0.41f, 0.11f, 0.022f,
            0.50f, 0.20f, 0.165f, 0.50f, 0.10f, 0.028f,
            a(240, 0xeff6ff), a(180, 0x93c5fd), a(150, 0x3b82f6), android.graphics.Paint.Align.CENTER)
    ));

    private MvmWallpaperCatalog() {}

    public static List<Spec> all() { return ITEMS; }

    public static Spec find(String id) {
        if (id != null) {
            for (Spec s : ITEMS) {
                if (s.id.equals(id)) return s;
            }
        }
        return ITEMS.get(0);
    }
}
