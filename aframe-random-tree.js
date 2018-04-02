AFRAME.registerPrimitive('a-tree', {
  defaultComponents: {
    tree: {},
    rotation: '90 0 0',
    scale: '0.1 0.1 0.1'
  }
});

AFRAME.registerComponent('tree', {
  init: function() {
    var el = this.el;
    var tree = new Tree(true);
    el.setObject3D('mesh', tree.mesh);
  }
});

var Math2 = {
  rangeRandom : function (v1, v2){
    var max = Math.max(v1,v2);
    var min = (max==v1)?v2 : v1;
    return min + Math.random()*(max-min);
  },

  rangeRandomInt : function (v1,v2){
    var max = Math.max(v1,v2);
    var min = (max==v1)?v2 : v1;
    var rnd = min + Math.random()*(max-min);
    return Math.round(rnd);
  },

  distance: function(v1, v2) {
    return Math.sqrt(Math.pow(v1.x - v2.x, 2) + Math.pow(v1.y - v2.y, 2) + Math.pow(v1.z - v2.z, 2));
  }
}

var foliages = [];
var foliagesComplex = [];

////////////////////////////////////////////////
//                                   STATS & GUI
////////////////////////////////////////////////
var stats;
var parameters = {
  truncHeight:100,
  truncThickness:2,
  truncColor:Colors.grey_d,
  truncNoise:1,
  foliageColor:"pinks",
  foliageDensity:8,
  foliageNoise:.2,
  foliageSize : 30,
  animationSpeed: 2.5,
};


////////////////////////////////////////////////
//                                        MODELS
////////////////////////////////////////////////

// TREE

Tree = function(complex){
  this.mesh = new THREE.Object3D();
  this.trunc = new Trunc(complex);
  this.mesh.add(this.trunc.mesh);
}

// TRUNC

Trunc = function(complex){
  this.type = "trunc";
  this.pointsTrunc = [];
  this.hierarchy = 1;
  
  // parametrables
  this.truncColor = Colors.getRandomFrom(Colors.trunc);
  this.truncHeight = Math2.rangeRandom(70,100);
  this.truncStartRadius = parameters.truncThickness; 
  this.verticalSegments = Math2.rangeRandomInt(9,12);
  this.radiusSegments = Math2.rangeRandomInt(6,10);
  this.shapeAngleStart = Math2.rangeRandom(Math.PI/4, Math.PI/2); 
  this.shapeAmplitude = Math2.rangeRandom(this.truncStartRadius/4, this.truncStartRadius*3);
  this.noise = parameters.truncNoise;
  this.shapeAngle = Math.PI - this.shapeAngleStart;
  this.freq = this.shapeAngle/this.verticalSegments;
  this.segHeight = (this.truncHeight / this.verticalSegments);

  this.pointsTrunc.push( new THREE.Vector3( 0, 0, 0 ) );  
  var ty,tx, tz, i;
  ty = 0;
  for ( i = 0; i < this.verticalSegments; i ++ ) {
    tx = Math.sin( this.shapeAngleStart + (i * this.freq) ) * this.shapeAmplitude + this.truncStartRadius;
    tz = 0;
    this.pointsTrunc.push( new THREE.Vector3( tx, tz, ty ) );
    if (i < this.verticalSegments -1) {
      ty += this.segHeight;
    }else{
      ty += this.segHeight/4;
    }
  }
  this.pointsTrunc.push( new THREE.Vector3( 0, 0, ty ) );
  this.mesh = new CustomMesh.Lathe( this.pointsTrunc, this.radiusSegments, this.truncColor);
  this.mesh.userData.hierarchy = this.hierarchy;
  this.mesh.userData.refClass = this;
  var geom = this.mesh.geometry;

  var defAttachs;
  defAttachs = [{
    type:"elbowBranch",   
    count : 5,   
    minH : this.truncHeight*.5,   
    maxH:this.truncHeight*.9,  
    minAngle: 0,    
    maxAngle: 0
  }];
  
  this.attachsVerts = GeometryHelpers.getAttachs(geom, defAttachs); 
  if (this.noise) GeometryHelpers.makeNoise(geom, this.noise);
  this.verticesNormals = GeometryHelpers.getVerticesNormals(geom);
  
  CustomMesh.flatshadeGeometry(geom);

  var colorFoliagePalette = (complex)? Colors[parameters.foliageColor] : Colors.getRandomFrom([Colors.pinks, Colors.yellows, Colors.greens, Colors.purples]);
  
  for (i=0; i<this.attachsVerts.length; i++){
    var attDef = this.attachsVerts[i];
    var attach, s, r, th;

    attach = (new Foliage(Math2.rangeRandom(20,24), colorFoliagePalette, this.hierarchy+1, complex)).mesh;

    attach.position.copy({
      x: geom.vertices[attDef.index].x + Math2.rangeRandom(-15, 15),
      y: geom.vertices[attDef.index].y + Math2.rangeRandom(-30, 0),
      z: geom.vertices[attDef.index].z
    });
    attach.userData.targetRotZ = attach.rotation.z;
    attach.userData.hierarchy = this.hierarchy+1;
    
    this.mesh.add(attach);
    attDef.mesh = attach;
  }
  geom.verticesNeedUpdate = true;
}

// FOLIAGE

Foliage = function(scale, colorPalette, hierarchy,complex){
  this.type="foliage";
  var sw = Math2.rangeRandomInt(3,10);
  var sh = Math2.rangeRandomInt(3,6);
  var noise = (complex)? parameters.foliageNoise*scale : Math2.rangeRandom(scale/20,scale/5);
  this.colPalette = colorPalette;
  this.col = Colors.getRandomFrom(this.colPalette);
  this.scale = scale;
  
  this.mesh = new CustomMesh.SphereMesh(scale,sw,sh,this.col, false);
  this.mesh.userData.refClass = this;
  this.mesh.userData.hierarchy = hierarchy;
  
  var geom = this.mesh.geometry;
  geom.mergeVertices();
  var h = scale*2;
  var defAttachs;
  if (complex){
    defAttachs = [
      {type:"subFol",   count : 6,  minH : h*.2,  maxH:h*.9,  minAngle:0,   maxAngle:0  },
    ];  
  }else{
    defAttachs = [];
  }
  
  this.attachsVerts = GeometryHelpers.getAttachs(geom, defAttachs);

  GeometryHelpers.makeNoise(geom, noise);
  
  CustomMesh.flatshadeGeometry(geom);

  for (var i=0;i<this.attachsVerts.length;i++){
    var attDef = this.attachsVerts[i];
    var v = geom.vertices[attDef.index];    
    var s = Math2.rangeRandom(scale*.05, scale*.2);
    var subFol = new SubFoliage(s, hierarchy+1).mesh;
    attDef.mesh = subFol;
    subFol.position.copy(v);
    subFol.rotation.z = Math2.rangeRandom(-Math.PI/8, Math.PI/8);
    subFol.rotation.x = Math2.rangeRandom(-Math.PI/8, Math.PI/8);
    this.mesh.add(subFol);
  }
}

SubFoliage = function(scale, hierarchy){
  this.type = "subfoliage";
  var sw = Math2.rangeRandomInt(2,4);
  var sh = Math2.rangeRandomInt(2,4);
  this.mesh = new CustomMesh.SphereMesh(scale,sw,sh,Colors.getRandomFrom(Colors.leaves), true); 
  this.mesh.userData.hierarchy = hierarchy;
  this.mesh.userData.refClass = this;
}
