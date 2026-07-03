"""Bake Soldier.glb mocap clips onto the sumo rig via world-space constraints,
then re-export the GLB with embedded Idle/Walk/Run animations."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
import bpy

bpy.ops.wm.open_mainfile(filepath=os.path.join(HERE, "sumo_final.blend"))

# our armature + parts
rig = next(o for o in bpy.data.objects if o.type == "ARMATURE" and "rig" in o.name.lower() or o.type == "ARMATURE")
rigs = [o for o in bpy.data.objects if o.type == "ARMATURE"]
rig = rigs[0]
print("our rig:", rig.name, len(rig.data.bones))

before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, "three-repo/examples/models/gltf/Soldier.glb"))
new_objs = set(bpy.data.objects) - before
sold = next(o for o in new_objs if o.type == "ARMATURE")
print("soldier rig:", sold.name, len(sold.data.bones))
# hide soldier meshes from render/export considerations later
for o in new_objs:
    o.hide_set(False)

actions = {a.name: a for a in bpy.data.actions}
print("actions:", list(actions.keys()))

def norm(n):
    return n.replace(":", "").replace("_", "").lower()

sold_bones = {norm(b.name): b.name for b in sold.data.bones}

# add world-space constraints our-bone -> soldier-bone
bpy.context.view_layer.objects.active = rig
for pb in rig.pose.bones:
    key = norm(pb.name)
    if key not in sold_bones:
        continue
    c = pb.constraints.new("COPY_ROTATION")
    c.target = sold
    c.subtarget = sold_bones[key]
    c.target_space = "WORLD"
    c.owner_space = "WORLD"
    if "hips" in key:
        cl = pb.constraints.new("COPY_LOCATION")
        cl.target = sold
        cl.subtarget = sold_bones[key]
        cl.target_space = "WORLD"
        cl.owner_space = "WORLD"

if not rig.animation_data:
    rig.animation_data_create()
if not sold.animation_data:
    sold.animation_data_create()

baked = []
for want in ("Idle", "Walk", "Run"):
    act = None
    for name, a in actions.items():
        if want.lower() in name.lower():
            act = a
            break
    if not act:
        print("MISSING clip", want)
        continue
    sold.animation_data.action = act
    f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
    print("baking", want, f0, f1)
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.nla.bake(frame_start=f0, frame_end=f1, step=1, only_selected=False,
                     visual_keying=True, clear_constraints=False, use_current_action=False,
                     bake_types={"POSE"})
    bpy.ops.object.mode_set(mode="OBJECT")
    na = rig.animation_data.action
    na.name = want
    rig.animation_data.action = None
    baked.append((want, na, f0, f1))

# strip constraints
for pb in rig.pose.bones:
    for c in list(pb.constraints):
        pb.constraints.remove(c)

# stash clips as NLA strips so the gltf exporter emits them as separate animations
for want, na, f0, f1 in baked:
    tr = rig.animation_data.nla_tracks.new()
    tr.name = want
    st = tr.strips.new(want, max(f0, 1), na)
    tr.mute = True
print("baked:", [b[0] for b in baked])

# delete soldier
for o in list(new_objs):
    bpy.data.objects.remove(o, do_unlink=True)

# select our parts + rig, export
bpy.ops.object.select_all(action="DESELECT")
count = 0
for o in bpy.data.objects:
    if o.type in ("MESH", "ARMATURE"):
        o.select_set(True)
        count += 1
bpy.context.view_layer.objects.active = rig
print("exporting", count, "objects")
glb = os.path.join(HERE, "hoshoryu.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True,
                          export_animations=True, export_skins=True, export_yup=True,
                          export_apply=True, export_nla_strips=True,
                          export_image_format="AUTO")
print("EXPORTED", glb, os.path.getsize(glb) // 1024, "KB")
