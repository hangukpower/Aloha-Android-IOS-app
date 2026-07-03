"""Full Hoshoryu-inspired yokozuna build: MPFB2 body, baked skin, eyes, hair,
white keiko-mawashi + tsuna, mixamo rig, GLB export + preview renders."""
import sys, os, math, traceback
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
import bpy
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)

EXT_MOD = "bl_ext.user_default.mpfb"
import addon_utils
addon_utils.enable(EXT_MOD, default_set=True)
mpfb = __import__(EXT_MOD, fromlist=["MPFB_CONTEXTUAL_INFORMATION"])
CTX = mpfb.MPFB_CONTEXTUAL_INFORMATION
if CTX is None:
    mpfb.register()
    CTX = mpfb.MPFB_CONTEXTUAL_INFORMATION
S = CTX["SERVICES"]
HumanService, TargetService, LocationService = S["HumanService"], S["TargetService"], S["LocationService"]
print("== services ready")

# ----------------------------------------------------------------- 1. body
macro = {
    "gender": 1.0, "age": 0.45, "muscle": 0.85, "weight": 1.0,
    "proportions": 0.55, "height": 0.68, "cupsize": 0.5, "firmness": 0.6,
    "race": {"asian": 1.0, "caucasian": 0.0, "african": 0.0},
}
body = HumanService.create_human(macro_detail_dict=macro, feet_on_ground=True)

def tgt(rel, w):
    p = os.path.join(LocationService.get_mpfb_data("targets"), rel)
    if os.path.exists(p):
        TargetService.load_target(body, p, weight=w)
    else:
        print("missing target", rel)

tgt("stomach/stomach-pregnant-incr.target.gz", 0.7)
tgt("stomach/stomach-tone-decr.target.gz", 0.35)
tgt("cheek/l-cheek-volume-incr.target.gz", 0.85)
tgt("cheek/r-cheek-volume-incr.target.gz", 0.85)
tgt("chin/chin-jaw-incr.target.gz", 0.6)
tgt("neck/neck-double-chin-incr.target.gz", 0.35)
tgt("torso/torso-vshape-incr.target.gz", 0.35)
print("== body shaped, verts", len(body.data.vertices))

rig = HumanService.add_builtin_rig(body, "mixamo", import_weights=True)
print("== rig", len(rig.data.bones), "bones")

# ------------------------- 2. skin: procedural tone + pores, baked to maps
skin = bpy.data.materials.new("ProcSkin")
skin.use_nodes = True
nt = skin.node_tree
pb2 = nt.nodes["Principled BSDF"]
pb2.inputs["Roughness"].default_value = 0.52

tex1 = nt.nodes.new("ShaderNodeTexNoise")   # broad tonal mottling
tex1.inputs["Scale"].default_value = 14
tex1.inputs["Detail"].default_value = 4
ramp1 = nt.nodes.new("ShaderNodeValToRGB")
ramp1.color_ramp.elements[0].position = 0.35
ramp1.color_ramp.elements[0].color = (0.60, 0.42, 0.30, 1)
ramp1.color_ramp.elements[1].position = 0.72
ramp1.color_ramp.elements[1].color = (0.72, 0.55, 0.42, 1)
nt.links.new(tex1.outputs["Fac"], ramp1.inputs["Fac"])
nt.links.new(ramp1.outputs["Color"], pb2.inputs["Base Color"])

tex2 = nt.nodes.new("ShaderNodeTexNoise")   # fine pores
tex2.inputs["Scale"].default_value = 260
tex2.inputs["Detail"].default_value = 3
bump = nt.nodes.new("ShaderNodeBump")
bump.inputs["Strength"].default_value = 0.18
nt.links.new(tex2.outputs["Fac"], bump.inputs["Height"])
nt.links.new(bump.outputs["Normal"], pb2.inputs["Normal"])

body.data.materials.clear()
body.data.materials.append(skin)
print("== procedural skin assigned")

# ----------------------------------------------------------------- 3. bake
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 4
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
bpy.context.view_layer.objects.active = body

def bake_to(name, size, btype, pass_filter=None, colorspace="sRGB"):
    img = bpy.data.images.new(name, size, size, alpha=False)
    img.colorspace_settings.name = colorspace
    nodes_added = []
    for mat in body.data.materials:
        if not mat or not mat.node_tree:
            continue
        n = mat.node_tree.nodes.new("ShaderNodeTexImage")
        n.image = img
        mat.node_tree.nodes.active = n
        nodes_added.append((mat, n))
    kw = dict(type=btype, margin=8, use_selected_to_active=False)
    if pass_filter:
        kw["pass_filter"] = pass_filter
    bpy.ops.object.bake(**kw)
    img.pack()
    for mat, n in nodes_added:
        mat.node_tree.nodes.remove(n)
    print("== baked", name)
    return img

skin_d = skin_n = None
try:
    skin_d = bake_to("skin_diffuse", 2048, "DIFFUSE", {"COLOR"})
    # warm the tone toward a sun-tanned rikishi complexion
    px = np.array(skin_d.pixels[:]).reshape(-1, 4)
    px[:, 0] *= 1.0
    px[:, 1] *= 0.92
    px[:, 2] *= 0.84
    skin_d.pixels[:] = px.clip(0, 1).ravel()
    skin_d.pack()
except Exception as e:
    print("diffuse bake failed:", e)
try:
    scene.cycles.samples = 2
    skin_n = bake_to("skin_normal", 1024, "NORMAL", None, "Non-Color")
except Exception as e:
    print("normal bake failed:", e)

# export material
em = bpy.data.materials.new("SumoSkin")
em.use_nodes = True
bsdf = em.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Roughness"].default_value = 0.55
if skin_d:
    tn = em.node_tree.nodes.new("ShaderNodeTexImage")
    tn.image = skin_d
    em.node_tree.links.new(tn.outputs["Color"], bsdf.inputs["Base Color"])
else:
    bsdf.inputs["Base Color"].default_value = (0.62, 0.42, 0.28, 1)
if skin_n:
    nm = em.node_tree.nodes.new("ShaderNodeNormalMap")
    nm.inputs["Strength"].default_value = 0.6
    tn2 = em.node_tree.nodes.new("ShaderNodeTexImage")
    tn2.image = skin_n
    em.node_tree.links.new(tn2.outputs["Color"], nm.inputs["Color"])
    em.node_tree.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
body.data.materials.clear()
body.data.materials.append(em)

# ------------------------------------------------ 4. flatten (apply helpers)
dg = bpy.context.evaluated_depsgraph_get()
ev = body.evaluated_get(dg)
newmesh = bpy.data.meshes.new_from_object(ev, preserve_all_data_layers=True, depsgraph=dg)
body.data = newmesh
if body.data.shape_keys:
    body.shape_key_clear()
for m in list(body.modifiers):
    body.modifiers.remove(m)
arm_mod = body.modifiers.new("Armature", "ARMATURE")
arm_mod.object = rig
body.data.materials.clear()
body.data.materials.append(em)
print("== flattened, verts", len(body.data.vertices))

# body landmark measurements
verts = np.array([v.co[:] for v in body.data.vertices])
zmax = verts[:, 2].max()
print("height:", round(zmax, 3))
def slice_stats(z, tol=0.03):
    # torso-only slice: exclude the A-pose arms/hands
    sl = verts[(np.abs(verts[:, 2] - z) < tol) &
               (np.abs(verts[:, 0]) < 0.30) & (np.abs(verts[:, 1]) < 0.32)]
    return sl

# eye socket centers via joint vertex groups if present, else estimate
eyeL = eyeR = None
gidx = {g.name: g.index for g in body.vertex_groups}
def group_center(names):
    idxs = [gidx[n] for n in names if n in gidx]
    if not idxs:
        return None
    acc, cnt = Vector((0, 0, 0)), 0
    for v in body.data.vertices:
        for ge in v.groups:
            if ge.group in idxs and ge.weight > 0.3:
                acc += v.co
                cnt += 1
    return acc / cnt if cnt else None

eyeL = group_center(["joint-l-eye"])
eyeR = group_center(["joint-r-eye"])
print("eye sockets:", eyeL, eyeR)

def face_front(cx, cz, hw=0.02, hz=0.012):
    m = (np.abs(verts[:, 0] - cx) < hw) & (np.abs(verts[:, 2] - cz) < hz) & (verts[:, 1] < 0)
    sel = verts[m]
    return sel[:, 1].min() if len(sel) else None

# ----------------------------------------------------------------- 5. eyes
scleramat = bpy.data.materials.new("sclera")
scleramat.use_nodes = True
sb = scleramat.node_tree.nodes["Principled BSDF"]
sb.inputs["Base Color"].default_value = (0.92, 0.89, 0.86, 1)
sb.inputs["Roughness"].default_value = 0.12
irismat = bpy.data.materials.new("iris")
irismat.use_nodes = True
ib = irismat.node_tree.nodes["Principled BSDF"]
ib.inputs["Base Color"].default_value = (0.10, 0.05, 0.025, 1)
ib.inputs["Roughness"].default_value = 0.08

def add_eye(center, side):
    if center is None:
        return None
    fy = face_front(center.x, center.z)
    ey = (fy + 0.0122) if fy is not None else (center.y - 0.011)
    center = Vector((center.x, ey, center.z))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.0142, location=center)
    eye = bpy.context.active_object
    eye.name = f"Eye_{side}"
    bpy.ops.object.shade_smooth()
    eye.data.materials.append(scleramat)
    # iris+pupil: small dark glossy dome at the front pole (character faces -Y)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.0066,
        location=center + Vector((0, -0.0128, 0)))
    iris = bpy.context.active_object
    iris.scale = (1, 0.45, 1)
    bpy.ops.object.shade_smooth()
    iris.data.materials.append(irismat)
    for ob in (eye, iris):
        vg = ob.vertex_groups.new(name="mixamorig:Head")
        vg.add(list(range(len(ob.data.vertices))), 1.0, "REPLACE")
        am = ob.modifiers.new("Armature", "ARMATURE")
        am.object = rig
    return [eye, iris]

eyes = []
for c, s in ((eyeL, "L"), (eyeR, "R")):
    r = add_eye(c, s)
    if r:
        eyes += r

# ----------------------------------------------------------------- 6. hair
hairmat = bpy.data.materials.new("hair")
hairmat.use_nodes = True
hb = hairmat.node_tree.nodes["Principled BSDF"]
hb.inputs["Base Color"].default_value = (0.02, 0.015, 0.012, 1)
hb.inputs["Roughness"].default_value = 0.32

head_top = verts[verts[:, 2] > zmax - 0.02].mean(axis=0)
# slicked hair: flattened sphere intersecting the skull (reads as a hairline)
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.098,
                                     location=(0, head_top[1] + 0.03, zmax - 0.052))
cap = bpy.context.active_object
cap.name = "HairCap"
cap.scale = (0.96, 1.06, 0.6)
# combed-back side/nape hair
bpy.ops.mesh.primitive_uv_sphere_add(segments=28, ring_count=14, radius=0.094,
                                     location=(0, head_top[1] + 0.052, zmax - 0.105))
backhair = bpy.context.active_object
backhair.name = "BackHair"
backhair.scale = (0.96, 0.82, 1.05)
bpy.ops.object.shade_smooth()
backhair.data.materials.append(hairmat)
vgbh = backhair.vertex_groups.new(name="mixamorig:Head")
vgbh.add(list(range(len(backhair.data.vertices))), 1.0, "REPLACE")
ambh = backhair.modifiers.new("Armature", "ARMATURE")
ambh.object = rig
bpy.ops.object.shade_smooth()
cap.data.materials.append(hairmat)

# chonmage bun lying flat on the crown, pointing forward
bpy.ops.mesh.primitive_cylinder_add(radius=0.0135, depth=0.075,
                                    location=(0, head_top[1] - 0.015, zmax + 0.020))
bun = bpy.context.active_object
bun.name = "Bun"
bun.rotation_euler = (math.radians(100), 0, 0)
bpy.ops.object.shade_smooth()
bun.data.materials.append(hairmat)
# the little forward tip of the chonmage
bpy.ops.mesh.primitive_cone_add(radius1=0.009, depth=0.035,
                                location=(0, head_top[1] - 0.046, zmax + 0.004),
                                rotation=(math.radians(-38), 0, 0))
tip = bpy.context.active_object
tip.name = "BunTip"
bpy.ops.object.shade_smooth()
tip.data.materials.append(hairmat)

for ob in [cap, bun, tip]:
    vg = ob.vertex_groups.new(name="mixamorig:Head")
    vg.add(list(range(len(ob.data.vertices))), 1.0, "REPLACE")
    am = ob.modifiers.new("Armature", "ARMATURE")
    am.object = rig

# ------------------------------------------------------- 7. mawashi + tsuna
# armless torso copy: shrinkwrap target so bands never snap to the arms
torso_tgt = body.copy()
torso_tgt.data = body.data.copy()
bpy.context.scene.collection.objects.link(torso_tgt)
arm_groups = [g.index for g in torso_tgt.vertex_groups
              if "Arm" in g.name or "Hand" in g.name or "Shoulder" in g.name]
drop = [v.index for v in torso_tgt.data.vertices
        if sum(ge.weight for ge in v.groups if ge.group in arm_groups) > 0.3]
import bmesh
bm = bmesh.new()
bm.from_mesh(torso_tgt.data)
bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[bm.verts[i] for i in drop], context="VERTS")
bm.to_mesh(torso_tgt.data)
bm.free()
print("torso target verts:", len(torso_tgt.data.vertices))

# find hips height from rig
hips_z = rig.data.bones["mixamorig:Hips"].head_local.z
belt_z = hips_z + 0.015
sl = slice_stats(belt_z, 0.04)
rad = max(np.abs(sl[:, 0]).max(), np.abs(sl[:, 1]).max()) + 0.012
print("belt z", round(belt_z, 3), "radius", round(rad, 3))

clothmat = bpy.data.materials.new("mawashi")
clothmat.use_nodes = True
cb = clothmat.node_tree.nodes["Principled BSDF"]
cb.inputs["Base Color"].default_value = (0.72, 0.50, 0.10, 1)
cb.inputs["Roughness"].default_value = 0.8

ropemat = bpy.data.materials.new("tsuna")
ropemat.use_nodes = True
rb = ropemat.node_tree.nodes["Principled BSDF"]
rb.inputs["Base Color"].default_value = (0.98, 0.97, 0.93, 1)
rb.inputs["Roughness"].default_value = 0.85

def weight_to_body(ob, bones=("mixamorig:Hips", "mixamorig:Spine")):
    for bn in bones:
        if bn not in [g.name for g in ob.vertex_groups]:
            ob.vertex_groups.new(name=bn)
    w = 1.0 / len(bones)
    for bn in bones:
        ob.vertex_groups[bn].add(list(range(len(ob.data.vertices))), w, "REPLACE")
    am = ob.modifiers.new("Armature", "ARMATURE")
    am.object = rig

# belt: three stacked wrap bands for the keiko-mawashi look
belts = []
for i, (bz, bh) in enumerate([(belt_z - 0.055, 0.075), (belt_z, 0.075), (belt_z + 0.055, 0.075)]):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=rad + i * 0.0012, depth=bh, location=(0, 0.01, bz))
    b = bpy.context.active_object
    b.name = f"Mawashi{i}"
    sw = b.modifiers.new("sw", "SHRINKWRAP")
    sw.target = torso_tgt
    sw.wrap_mode = "OUTSIDE_SURFACE"
    sw.offset = 0.008 + i * 0.0015
    bpy.ops.object.modifier_apply(modifier="sw")
    sol = b.modifiers.new("sol", "SOLIDIFY")
    sol.thickness = 0.008
    bpy.ops.object.modifier_apply(modifier="sol")
    bpy.ops.object.shade_smooth()
    b.data.materials.append(clothmat)
    weight_to_body(b)
    belts.append(b)

# kesho-mawashi apron: flat gold panel hanging from the belt front
bpy.ops.mesh.primitive_grid_add(x_subdivisions=4, y_subdivisions=8, size=1,
                                location=(0, -rad - 0.018, belt_z - 0.30))
pan = bpy.context.active_object
pan.name = "KeshoApron"
pan.scale = (0.16, 0.26, 1)
pan.rotation_euler = (math.radians(96), 0, 0)
bpy.ops.object.transform_apply(scale=True, rotation=True)
solp = pan.modifiers.new("sol", "SOLIDIFY")
solp.thickness = 0.007
bpy.ops.object.modifier_apply(modifier="sol")
bpy.ops.object.shade_smooth()
pan.data.materials.append(clothmat)
weight_to_body(pan)
belts.append(pan)
# black braided fringe at the hem of the apron
fringemat = bpy.data.materials.new("fringe")
fringemat.use_nodes = True
fb = fringemat.node_tree.nodes["Principled BSDF"]
fb.inputs["Base Color"].default_value = (0.03, 0.03, 0.035, 1)
fb.inputs["Roughness"].default_value = 0.7
bpy.ops.mesh.primitive_cube_add(location=(0, -rad - 0.052, belt_z - 0.445))
fr = bpy.context.active_object
fr.name = "Fringe"
fr.scale = (0.16, 0.02, 0.05)
bpy.ops.object.shade_smooth()
fr.data.materials.append(fringemat)
weight_to_body(fr)
belts.append(fr)

# back knot
bpy.ops.mesh.primitive_torus_add(major_radius=0.045, minor_radius=0.02,
                                 location=(0, sl[:, 1].max() + 0.02, belt_z + 0.02),
                                 rotation=(math.radians(90), 0, 0))
knot = bpy.context.active_object
knot.name = "Knot"
bpy.ops.object.shade_smooth()
knot.data.materials.append(clothmat)
weight_to_body(knot)

# tsuna rope above the belt
bpy.ops.mesh.primitive_torus_add(major_radius=rad + 0.015, minor_radius=0.034,
                                 major_segments=64, minor_segments=12,
                                 location=(0, 0.008, belt_z + 0.105))
tsuna = bpy.context.active_object
tsuna.name = "Tsuna"
sw = tsuna.modifiers.new("sw", "SHRINKWRAP")
sw.target = torso_tgt
sw.wrap_mode = "OUTSIDE_SURFACE"
sw.offset = 0.024
bpy.ops.object.modifier_apply(modifier="sw")
bpy.ops.object.shade_smooth()
tsuna.data.materials.append(ropemat)
weight_to_body(tsuna, ("mixamorig:Spine",))

# the big rope loop rising up the back (dohyo-iri style)
bpy.ops.mesh.primitive_torus_add(major_radius=0.125, minor_radius=0.026,
                                 major_segments=40, minor_segments=10,
                                 location=(0.02, sl[:, 1].max() + 0.015, belt_z + 0.22),
                                 rotation=(0, math.radians(90), math.radians(8)))
lp = bpy.context.active_object
bpy.ops.object.shade_smooth()
lp.data.materials.append(ropemat)
weight_to_body(lp, ("mixamorig:Spine",))
belts.append(lp)
# white folded bundles hanging at the front of the rope
for bx in (-0.05, 0.05):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.055,
        location=(bx, -rad + 0.035, belt_z - 0.01))
    bd = bpy.context.active_object
    bd.scale = (0.8, 0.62, 1.15)
    bpy.ops.object.shade_smooth()
    bd.data.materials.append(ropemat)
    weight_to_body(bd, ("mixamorig:Hips",))
    belts.append(bd)

# shide: zigzag paper strips hanging from the front of the tsuna
papermat = bpy.data.materials.new("shide")
papermat.use_nodes = True
pb = papermat.node_tree.nodes["Principled BSDF"]
pb.inputs["Base Color"].default_value = (0.99, 0.99, 0.97, 1)
pb.inputs["Roughness"].default_value = 0.6

def make_shide(ang):
    # zigzag strip mesh
    vs, fs = [], []
    L, W, folds = 0.165, 0.034, 4
    for i in range(folds + 1):
        z = -L * i / folds
        off = 0.008 if i % 2 else -0.008
        vs += [(-W / 2, off, z), (W / 2, off, z)]
        if i:
            a = (i - 1) * 2
            fs.append((a, a + 1, a + 3, a + 2))
    me = bpy.data.meshes.new("shide")
    me.from_pydata(vs, [], fs)
    ob = bpy.data.objects.new("Shide", me)
    bpy.context.scene.collection.objects.link(ob)
    x = math.sin(ang) * (rad + 0.03)
    y = -math.cos(ang) * (rad + 0.035) + 0.01
    ob.location = (x, y - 0.016, belt_z + 0.06)
    ob.rotation_euler = (0, 0, -ang)
    sol = ob.modifiers.new("sol", "SOLIDIFY")
    sol.thickness = 0.002
    ob.data.materials.append(papermat)
    weight_to_body(ob, ("mixamorig:Spine",))
    return ob

shides = [make_shide(a) for a in (-0.38, 0.0, 0.38)]

# brows: thin dark strips shrinkwrapped over the eye ridges
brows = []
if eyeL is not None and eyeR is not None:
    for c, side in ((eyeL, 1), (eyeR, -1)):
        by = face_front(c.x, c.z + 0.028, hw=0.028, hz=0.01)
        by = (by - 0.004) if by is not None else (c.y - 0.042)
        bpy.ops.mesh.primitive_cube_add(location=(c.x, by, c.z + 0.026))
        br = bpy.context.active_object
        br.name = f"Brow{side}"
        br.scale = (0.030, 0.005, 0.0062)
        br.rotation_euler = (math.radians(5), math.radians(9 * side), math.radians(-2 * side))
        bpy.ops.object.shade_smooth()
        br.data.materials.append(hairmat)
        vg = br.vertex_groups.new(name="mixamorig:Head")
        vg.add(list(range(len(br.data.vertices))), 1.0, "REPLACE")
        am = br.modifiers.new("Armature", "ARMATURE")
        am.object = rig
        brows.append(br)

# nipples: small dark discs at the pec apex
nipmat = bpy.data.materials.new("nipple")
nipmat.use_nodes = True
nb = nipmat.node_tree.nodes["Principled BSDF"]
nb.inputs["Base Color"].default_value = (0.45, 0.26, 0.20, 1)
nb.inputs["Roughness"].default_value = 0.6
for sx in (-1, 1):
    m2 = ((np.abs(verts[:, 0] - sx * 0.105) < 0.04) &
          (verts[:, 2] > zmax - 0.60) & (verts[:, 2] < zmax - 0.50))
    sel = verts[m2]
    if len(sel):
        pnt = sel[np.argmin(sel[:, 1])]
        bpy.ops.mesh.primitive_cylinder_add(radius=0.013, depth=0.003,
            location=(pnt[0], pnt[1] - 0.001, pnt[2]),
            rotation=(math.radians(90), 0, 0))
        nip = bpy.context.active_object
        bpy.ops.object.shade_smooth()
        nip.data.materials.append(nipmat)
        weight_to_body(nip, ("mixamorig:Spine2",))
        belts.append(nip)

# ----------------------------------------------------------------- 8. export
bpy.data.objects.remove(torso_tgt, do_unlink=True)
parts = [body] + eyes + [cap, bun, tip, backhair] + belts + [knot, tsuna] + shides + brows
bpy.ops.object.select_all(action="DESELECT")
for ob in parts:
    ob.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig

glb_path = os.path.join(HERE, "hoshoryu.glb")
bpy.ops.export_scene.gltf(
    filepath=glb_path, export_format="GLB", use_selection=True,
    export_animations=False, export_skins=True, export_yup=True,
    export_apply=True, export_image_format="AUTO",
)
print("== exported", glb_path, os.path.getsize(glb_path) // 1024, "KB")

# ----------------------------------------------------------------- 9. views
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 720
scene.render.resolution_y = 900
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
scene.collection.objects.link(cam)
scene.camera = cam
sun2 = bpy.data.objects.new("sun", bpy.data.lights.new("sun", type="SUN"))
sun2.data.energy = 3.2
sun2.rotation_euler = (math.radians(55), 0, math.radians(-35))
scene.collection.objects.link(sun2)
fill = bpy.data.objects.new("fill", bpy.data.lights.new("fill", type="AREA"))
fill.data.energy = 260
fill.location = (2.5, -2.2, 1.5)
fill.data.size = 3
scene.collection.objects.link(fill)
world = bpy.data.worlds.new("w")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.75, 0.82, 0.9, 1)
world.node_tree.nodes["Background"].inputs[1].default_value = 0.65
scene.world = world

for name, loc, rot in [
    ("full", (0, -4.4, 1.1), (math.radians(87), 0, 0)),
    ("face", (0.35, -1.05, 1.62), (math.radians(83), 0, math.radians(17))),
    ("back", (0.3, 4.4, 1.2), (math.radians(85), 0, math.radians(176))),
]:
    cam.location = loc
    cam.rotation_euler = rot
    scene.render.filepath = os.path.join(HERE, f"sumo_{name}.png")
    bpy.ops.render.render(write_still=True)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "sumo_final.blend"))
print("ALL DONE")
