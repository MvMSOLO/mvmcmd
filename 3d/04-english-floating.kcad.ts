// MVMCMD 3D asset: English Lab floating-letter proxy
const base = box(30,12,4,true).fillet(1.0).color('#aeb7b2');
const m = box(7,8,8,true).translate(-9,0,5).color('#d7dacd');
const v = box(7,8,8,true).translate(0,0,5).color('#b4a48c');
const m2 = box(7,8,8,true).translate(9,0,5).color('#9aaa96');
return assembly('floating-letters').part('base',base).part('m',m).part('v',v).part('m2',m2).model();
