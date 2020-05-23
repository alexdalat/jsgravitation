var canvas = document.getElementById("canvas")
var ctx = canvas.getContext("2d")
canvas.width = window.innerWidth
canvas.height = window.innerHeight

var canvas2 = document.getElementById("canvas2")
var ctx2 = canvas2.getContext("2d")
canvas2.width = window.innerWidth
canvas2.height = window.innerHeight

const G = 0.4
var radii = 0.01
var init_vel = 10
var init_dist = 1

var time_step = 0.001
var speed = 1 // # of iterations per frame

// initalize in init
var config;
var canvasCenter;
var camera;
var bodies;

var positions = [[]]; // trail effect


function init() {
	camera = {
		pos: new vec2(0, 0),
		scale: document.getElementById("scaleSlider").value
	}

	bodies = [
		/*new Body(
			new vec2(-init_dist, 0),
			new vec2(0, -init_vel),
			masses, radii,
		),
		new Body(
			new vec2(init_dist, 0),
			new vec2(0, init_vel),
			masses, radii,
		),*/
		/*new Body(
			new vec2(0, init_dist),
			new vec2(-init_vel, 0),
			masses, radii,
		),
		new Body(
			new vec2(0, -init_dist),
			new vec2(init_vel, 0),
			masses, radii,
		),*/
		new Body(
			new vec2(0, 0),
			new vec2(20, 0),
			1000, 0,
			[0, 100, 100]
		),
		new Body(
			new vec2(0, init_dist),
			new vec2(0, 0),
			10, 0,
			[255, 255, 0]
		),
	]

	config = {
		show_trails: true,
		motion_trail_length: 10,
		trail_brightness_multiplier: 0.1,
	
	
		// camera
		camera_track: document.getElementById("cameraTrackSlider").checked,
	}

	canvasCenter = new vec2(canvas.width/2, canvas.height/2)

	ctx.rect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = "rgba(25, 29, 30, 1)"
	ctx.fill();

	ui();

	draw();
}

function ui() {
	updateScale(camera.scale);
	updateCameraTrack(config.camera_track);
}

var lastTick = performance.now()
function draw() {
	var now = performance.now()
	var deltaTime = now - lastTick
	lastTick = now

	// clear canvas
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.rect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = "rgb(25, 29, 30)"
	ctx.fill();

	var min_x = Infinity
	var max_x = -Infinity
	var min_y = Infinity
	var max_y = -Infinity


	for(let s = 0; s < speed; s++) {
		for(let i = 0; i < bodies.length; i++) {
			var body = bodies[i];
			var dt = deltaTime

			for(let j = 0; j < bodies.length; j++) {
				if(i===j)continue;
				body.tick(bodies[j], time_step);
			}

			if(body.pos.x > max_x) max_x = body.pos.x
			if(body.pos.x < min_x) min_x = body.pos.x
			if(body.pos.y > max_y) max_y = body.pos.y
			if(body.pos.y < min_y) min_y = body.pos.y

			var drawPos = canvasCenter.sub(camera.pos.sub(body.pos.scale(camera.scale)))

			if(config.show_trails) {
				if(positions[i] === undefined) positions.push([])
				for (var p = 0; p < positions[i].length; p++) {
					var ratio = (p + 1) / positions[i].length;
					ratio *= config.trail_brightness_multiplier;
					circle(canvasCenter.sub(camera.pos.sub(positions[i][p].scale(camera.scale))), body.r*camera.scale, rgbaToString(body.color.concat(ratio)));
				}
				storeLastPosition(positions[i], body.pos);
			}

			circle(drawPos, body.r*camera.scale, rgbaToString(body.color.concat(1)));
		}
	}

	//camera.scale = lerp(camera.scale, 1/((max_x - min_x) + (max_y-min_y))*canvas.width/2-200, 0.001)
	if(config.camera_track) {
		camera.pos.x = lerp(camera.pos.x, bodies[0].pos.x*camera.scale, 1)
		//camera.pos.x = lerp(camera.pos.x, min_x*camera.scale, 0.05)
		//camera.pos.y = lerp(camera.pos.y, min_y*camera.scale, 0.05)
	}

	setTimeout(() => requestAnimationFrame(draw), 0);
}

class Body {
	constructor(pos, vel, mass, radius, color) {
		this.pos = pos
		this.velocity = vel
		this.mass = mass
		if(radius == 0)this.r = Math.sqrt(G*mass) / 50
		else this.r = radius
		console.log(this.r)

		//if(color === undefined) color = HSVtoRGB(Math.random()*360, 100, 100)
		//if(color === undefined) color = [Math.random()*255, Math.random()*255, Math.random()*255]
		this.color = color
		console.log(this.color)
	}
	tick(other_body, dt) {
		var a0 = this.getAcceleration(other_body)
		this.velocity = this.velocity.add(a0.scale(0.5 * dt))
		this.pos = this.pos.add(this.velocity.scale(dt))

		var a1 = this.getAcceleration(other_body)

		this.velocity = this.velocity.add(a1.scale(0.5 * dt))
	}
	getAcceleration(other_body) {
		var slope = (other_body.pos.y - this.pos.y)/(other_body.pos.x - this.pos.x)
		var angle = Math.atan(slope)
		var distanceSquared = this.pos.distanceSquared(other_body.pos)
		var F = G * this.mass * other_body.mass / distanceSquared;
		var xForce = F * Math.cos(angle)
		var yForce = F * Math.sin(angle)

		var new_acceleration = new vec2(Math.abs(xForce / this.mass), Math.abs(yForce / this.mass))
		if(this.pos.x > other_body.pos.x)
			new_acceleration.x = -new_acceleration.x;
		if(this.pos.y > other_body.pos.y)
			new_acceleration.y = -new_acceleration.y;
		return new_acceleration
	}

	getG() {
		return (G * this.mass) / Math.pow(this.r, 2);
	}
}

class vec2 {
	constructor(x, y) {
		if(x===undefined)x=0
		if(y===undefined)y=0
		this.x = x;
		this.y = y;
	}
	add(v2) {
		return new vec2(this.x + v2.x, this.y + v2.y)
	}
	sub(v2) {
		return new vec2(this.x - v2.x, this.y - v2.y)
	}
	scale(f) {
		return new vec2(this.x * f, this.y * f)
	}

	distance(v2) {
		return Math.sqrt(Math.pow(v2.x - this.x, 2) + Math.pow(v2.y - this.y, 2))
	}
	distanceSquared(v2) {
		return Math.pow(v2.x - this.x, 2) + Math.pow(v2.y - this.y, 2)
	}


	static add(v1, v2) {
		return new vec2(v1.x + v2.x, v1.y + v2.y)
	}
	static sub(v1, v2) {
		return new vec2(v1.x - v2.x, v1.y - v2.y)
	}
}

function circle(xy, r, color) {
	ctx.beginPath();
	ctx.arc(xy.x, xy.y, r, 0, 2 * Math.PI);
	ctx.fillStyle = color;
	ctx.fill();
}

function updateScale(value) {
	camera.scale = value;
	document.getElementById("scaleConsole").innerHTML = camera.scale;
}
function updateCameraTrack(value) {
	config.camera_track = value;
	console.log(value)
}

function storeLastPosition(arr, xy) {
	// push an item
	arr.push(xy);
   
	//get rid of first item
	if (arr.length > config.motion_trail_length) {
		arr.shift();
	}
  }

function rgbToString(rgb) {
	if(rgb.r === undefined)
		return "rgb("+rgb[0]+", "+rgb[2]+", "+rgb[2]+")"
	else
		return "rgb("+rgb.r+", "+rgb.g+", "+rgb.b+")"
}
function rgbaToString(rgba) {
	if(rgba.r === undefined)
		return "rgb("+rgba[0]+", "+rgba[2]+", "+rgba[2]+", "+rgba[3]+")"
	else
		return "rgb("+rgba.r+", "+rgba.g+", "+rgba.b+", "+rgba.a+")"
}
function HSVtoRGB(h, s, v) {
    var r, g, b;
    var i;
    var f, p, q, t;
    // Make sure our arguments stay in-range
    h = Math.max(0, Math.min(360, h));
    s = Math.max(0, Math.min(100, s));
    v = Math.max(0, Math.min(100, v));
    s /= 100;
    v /= 100;
    if(s == 0) {
        // Achromatic (grey)
        r = g = b = v;
        return [
            Math.round(r * 255), 
            Math.round(g * 255), 
            Math.round(b * 255)
        ];
    }
    h /= 60; // sector 0 to 5
    i = Math.floor(h);
    f = h - i; // factorial part of h
    p = v * (1 - s);
    q = v * (1 - s * f);
    t = v * (1 - s * (1 - f));
    switch(i) {
        case 0:
            r = v;
            g = t;
            b = p;
            break;
     
        case 1:
            r = q;
            g = v;
            b = p;
            break;
     
        case 2:
            r = p;
            g = v;
            b = t;
            break;
     
        case 3:
            r = p;
            g = q;
            b = v;
            break;
     
        case 4:
            r = t;
            g = p;
            b = v;
            break;
     
        default: // case 5:
            r = v;
            g = p;
            b = q;
    }
    return [
        Math.round(r * 255), 
        Math.round(g * 255), 
        Math.round(b * 255)
    ];
}

function lerp(v0, v1, t) {
    return v0*(1-t)+v1*t
}




window.onload = init