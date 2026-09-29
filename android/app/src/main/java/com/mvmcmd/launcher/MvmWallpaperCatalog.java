package com.mvmcmd.launcher;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public final class MvmWallpaperCatalog {
    public static final class Spec {
        public final String id;
        public final String title;
        public final String asset;
        public final String style;
        public final float focusX, focusY, depth, drift;
        public final float clockX, clockY, clockSize;
        public final float dateX, dateY, dateSize;
        public final int clockColor, dateColor, accentColor;
        public final android.graphics.Paint.Align align;

        Spec(String id, String title, String asset, String style,
             float fx, float fy, float depth, float drift,
             float cx, float cy, float cs, float dx, float dy, float ds,
             int cc, int dc, int ac, android.graphics.Paint.Align align) {
            this.id=id; this.title=title; this.asset=asset; this.style=style;
            focusX=fx; focusY=fy; this.depth=depth; this.drift=drift;
            clockX=cx; clockY=cy; clockSize=cs; dateX=dx; dateY=dy; dateSize=ds;
            clockColor=cc; dateColor=dc; accentColor=ac; this.align=align;
        }
    }

    private static int a(int alpha, int rgb){ return (alpha << 24) | (rgb & 0x00ffffff); }

    private static final List<Spec> ITEMS = Collections.unmodifiableList(Arrays.asList(
        new Spec("scarlet_focus","Scarlet Focus","wallpapers/scarlet_focus.webp","ghost",.54f,.28f,.105f,.028f,.91f,.19f,.165f,.90f,.30f,.029f,a(225,0xf3e9ea),a(165,0xf0c4c7),a(120,0xff3340),android.graphics.Paint.Align.RIGHT),
        new Spec("midnight_tree","Midnight Tree","wallpapers/midnight_tree.webp","stack",.50f,.49f,.10f,.018f,.50f,.69f,.145f,.12f,.22f,.025f,a(220,0xe9f2ff),a(155,0xcfddec),a(95,0x9cc9ff),android.graphics.Paint.Align.CENTER),
        new Spec("moon_garden","Moon Garden","wallpapers/moon_garden.webp","clean",.56f,.40f,.095f,.020f,.50f,.39f,.152f,.50f,.25f,.030f,a(232,0xfff6df),a(155,0xffe7bc),a(105,0xffcf77),android.graphics.Paint.Align.CENTER),
        new Spec("quiet_grove","Quiet Grove","wallpapers/quiet_grove.webp","outline",.60f,.49f,.105f,.022f,.78f,.39f,.135f,.78f,.27f,.026f,a(210,0xeaf5e8),a(150,0xcce8d0),a(90,0x9fd79d),android.graphics.Paint.Align.CENTER),
        new Spec("orbital_bloom","Orbital Bloom","wallpapers/orbital_bloom.webp","ring",.50f,.50f,.11f,.025f,.50f,.47f,.13f,.50f,.67f,.026f,a(235,0xfff7d7),a(165,0xffd9a0),a(110,0xffcd67),android.graphics.Paint.Align.CENTER),
        new Spec("midnight_bmw","Midnight BMW","wallpapers/midnight_bmw.webp","left",.52f,.58f,.09f,.020f,.15f,.72f,.105f,.15f,.57f,.025f,a(225,0xf1f5f7),a(155,0xcad6dd),a(105,0xffffff),android.graphics.Paint.Align.LEFT),
        new Spec("crimson_spider","Crimson Spider","wallpapers/crimson_spider.webp","outline",.50f,.57f,.12f,.026f,.50f,.50f,.165f,.50f,.32f,.026f,a(214,0xffdfe3),a(150,0xffb4bd),a(120,0xff4652),android.graphics.Paint.Align.CENTER),
        new Spec("silent_alps","Silent Alps","wallpapers/silent_alps.webp","outline",.50f,.43f,.07f,.015f,.50f,.73f,.145f,.50f,.60f,.027f,a(210,0xeaf7ff),a(155,0xd2ebfa),a(95,0x8cc8ef),android.graphics.Paint.Align.CENTER),
        new Spec("azure_creek","Azure Creek","wallpapers/azure_creek.webp","right",.54f,.56f,.10f,.025f,.84f,.56f,.135f,.84f,.41f,.025f,a(215,0xdff8ff),a(155,0xb9e8f6),a(95,0x61cdf2),android.graphics.Paint.Align.CENTER),
        new Spec("starlit_field","Starlit Field","wallpapers/starlit_field.webp","outline",.50f,.55f,.10f,.026f,.50f,.72f,.145f,.50f,.60f,.027f,a(215,0xe9f5e9),a(150,0xc8ddcc),a(95,0xb6dfad),android.graphics.Paint.Align.CENTER),
        new Spec("fluid_signal","Fluid Signal","wallpapers/fluid_signal.webp","clean",.53f,.50f,.105f,.024f,.57f,.54f,.135f,.57f,.65f,.026f,a(228,0xeef7ff),a(150,0xc9dff2),a(105,0x85b5ff),android.graphics.Paint.Align.CENTER),
        new Spec("red_ronin","Red Ronin","wallpapers/red_ronin.webp","ghost",.50f,.69f,.13f,.026f,.50f,.82f,.165f,.50f,.71f,.026f,a(225,0xffe7e7),a(150,0xffb5b5),a(110,0xff4652),android.graphics.Paint.Align.CENTER),
        new Spec("gotham_rain","Gotham Rain","wallpapers/gotham_rain.webp","outline",.50f,.47f,.10f,.022f,.83f,.46f,.135f,.83f,.29f,.025f,a(212,0xf0f4f7),a(150,0xc8d5dd),a(95,0xb6d6ef),android.graphics.Paint.Align.CENTER),
        new Spec("deep_space","Deep Space","wallpapers/deep_space.webp","left",.50f,.48f,.095f,.030f,.18f,.56f,.145f,.81f,.19f,.026f,a(220,0xe7f2ff),a(150,0xc0d5ef),a(100,0x7caaff),android.graphics.Paint.Align.LEFT),
        new Spec("midnight_p1","Midnight P1","wallpapers/midnight_p1.webp","left",.67f,.58f,.09f,.021f,.18f,.80f,.108f,.18f,.68f,.025f,a(220,0xf1f4f5),a(150,0xc6ced4),a(110,0xd8e4ea),android.graphics.Paint.Align.LEFT),
        new Spec("amber_orbit","Amber Orbit","wallpapers/amber_orbit.webp","ring",.50f,.46f,.105f,.024f,.50f,.43f,.127f,.50f,.63f,.026f,a(232,0xfff4d5),a(160,0xffcf93),a(105,0xffc766),android.graphics.Paint.Align.CENTER),
        new Spec("ice_eyes","Ice Eyes","wallpapers/ice_eyes.webp","ghost",.50f,.48f,.11f,.028f,.87f,.20f,.162f,.87f,.31f,.028f,a(230,0xeaf9ff),a(165,0xbfeeff),a(120,0x70d8ff),android.graphics.Paint.Align.RIGHT)
    ));
    private MvmWallpaperCatalog() {}
    public static List<Spec> all(){ return ITEMS; }
    public static Spec find(String id){
        if(id!=null) for(Spec s:ITEMS) if(s.id.equals(id)) return s;
        return ITEMS.get(0);
    }
}