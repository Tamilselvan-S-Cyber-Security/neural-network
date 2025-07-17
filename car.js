/**
 * Car class for the neural network game
 * Handles car physics, sensors, and neural network integration
 */

class Car {
    constructor(x, y, width, height, controlType, maxSpeed = 5) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        
        this.speed = 0;
        this.acceleration = 0.2;
        this.maxSpeed = maxSpeed;
        this.friction = 0.05;
        this.angle = 0;
        this.damaged = false;
        
        this.useBrain = controlType === "AI";
        
        if (controlType !== "DUMMY") {
            this.sensor = new Sensor(this);
            this.brain = new NeuralNetwork(
                this.sensor.rayCount,
                8, // Hidden layer nodes
                4  // Output nodes: forward, left, right, reverse
            );
        }
        
        this.controls = new Controls(controlType);
        
        // For fitness calculation
        this.fitness = 0;
        this.distanceTraveled = 0;
        this.lastPosition = { x: this.x, y: this.y };
        this.stuckTime = 0;
        this.checkpointsPassed = 0;
    }
    
    update(roadBorders, traffic) {
        if (!this.damaged) {
            this.move();
            this.calculateFitness();
            this.polygon = this.createPolygon();
            this.damaged = this.assessDamage(roadBorders, traffic);
        }
        
        if (this.sensor) {
            this.sensor.update(roadBorders, traffic);
            
            if (this.useBrain) {
                // Get readings from sensors
                const offsets = this.sensor.readings.map(
                    s => s === null ? 0 : 1 - s.offset
                );
                
                // Get outputs from neural network
                const outputs = this.brain.predict(offsets);
                
                // Apply outputs to controls
                this.controls.forward = outputs[0] > 0.5;
                this.controls.left = outputs[1] > 0.5;
                this.controls.right = outputs[2] > 0.5;
                this.controls.reverse = outputs[3] > 0.5;
            }
        }
    }
    
    calculateFitness() {
        // Calculate distance traveled since last update
        const dx = this.x - this.lastPosition.x;
        const dy = this.y - this.lastPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.distanceTraveled += distance;
        
        // Update last position
        this.lastPosition.x = this.x;
        this.lastPosition.y = this.y;
        
        // Check if car is stuck (not moving much)
        if (distance < 0.1) {
            this.stuckTime++;
        } else {
            this.stuckTime = 0;
        }
        
        // Calculate fitness based on distance and checkpoints
        this.fitness = this.distanceTraveled + (this.checkpointsPassed * 100);
        
        // Penalize for being stuck
        if (this.stuckTime > 100) {
            this.fitness -= this.stuckTime * 0.1;
        }
    }
    
    assessDamage(roadBorders, traffic) {
        for (let i = 0; i < roadBorders.length; i++) {
            if (polysIntersect(this.polygon, roadBorders[i])) {
                return true;
            }
        }
        
        for (let i = 0; i < traffic.length; i++) {
            if (polysIntersect(this.polygon, traffic[i].polygon)) {
                return true;
            }
        }
        
        return false;
    }
    
    createPolygon() {
        const points = [];
        const rad = Math.hypot(this.width, this.height) / 2;
        const alpha = Math.atan2(this.width, this.height);
        
        points.push({
            x: this.x - Math.sin(this.angle - alpha) * rad,
            y: this.y - Math.cos(this.angle - alpha) * rad
        });
        
        points.push({
            x: this.x - Math.sin(this.angle + alpha) * rad,
            y: this.y - Math.cos(this.angle + alpha) * rad
        });
        
        points.push({
            x: this.x - Math.sin(Math.PI + this.angle - alpha) * rad,
            y: this.y - Math.cos(Math.PI + this.angle - alpha) * rad
        });
        
        points.push({
            x: this.x - Math.sin(Math.PI + this.angle + alpha) * rad,
            y: this.y - Math.cos(Math.PI + this.angle + alpha) * rad
        });
        
        return points;
    }
    
    move() {
        // Handle acceleration
        if (this.controls.forward) {
            this.speed += this.acceleration;
        }
        if (this.controls.reverse) {
            this.speed -= this.acceleration;
        }
        
        // Limit speed
        if (this.speed > this.maxSpeed) {
            this.speed = this.maxSpeed;
        }
        if (this.speed < -this.maxSpeed / 2) {
            this.speed = -this.maxSpeed / 2;
        }
        
        // Apply friction
        if (this.speed > 0) {
            this.speed -= this.friction;
        }
        if (this.speed < 0) {
            this.speed += this.friction;
        }
        
        // Stop completely if speed is very low
        if (Math.abs(this.speed) < this.friction) {
            this.speed = 0;
        }
        
        // Handle steering
        if (this.speed !== 0) {
            const flip = this.speed > 0 ? 1 : -1;
            
            if (this.controls.left) {
                this.angle += 0.03 * flip;
            }
            if (this.controls.right) {
                this.angle -= 0.03 * flip;
            }
        }
        
        // Update position based on speed and angle
        this.x -= Math.sin(this.angle) * this.speed;
        this.y -= Math.cos(this.angle) * this.speed;
    }
    
    draw(ctx, color, drawSensor = false) {
        if (this.damaged) {
            ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
        } else {
            ctx.fillStyle = color;
        }
        
        ctx.beginPath();
        ctx.moveTo(this.polygon[0].x, this.polygon[0].y);
        
        for (let i = 1; i < this.polygon.length; i++) {
            ctx.lineTo(this.polygon[i].x, this.polygon[i].y);
        }
        
        ctx.fill();
        
        if (this.sensor && drawSensor) {
            this.sensor.draw(ctx);
        }
    }
}

class Sensor {
    constructor(car) {
        this.car = car;
        this.rayCount = 5;
        this.rayLength = 150;
        this.raySpread = Math.PI / 2;
        
        this.rays = [];
        this.readings = [];
    }
    
    update(roadBorders, traffic) {
        this.castRays();
        this.readings = [];
        
        for (let i = 0; i < this.rays.length; i++) {
            this.readings.push(
                this.getReading(this.rays[i], roadBorders, traffic)
            );
        }
    }
    
    getReading(ray, roadBorders, traffic) {
        let touches = [];
        
        // Check road borders
        for (let i = 0; i < roadBorders.length; i++) {
            const touch = getIntersection(
                ray[0],
                ray[1],
                roadBorders[i][0],
                roadBorders[i][1]
            );
            
            if (touch) {
                touches.push(touch);
            }
        }
        
        // Check traffic
        for (let i = 0; i < traffic.length; i++) {
            const poly = traffic[i].polygon;
            
            for (let j = 0; j < poly.length; j++) {
                const value = getIntersection(
                    ray[0],
                    ray[1],
                    poly[j],
                    poly[(j + 1) % poly.length]
                );
                
                if (value) {
                    touches.push(value);
                }
            }
        }
        
        if (touches.length === 0) {
            return null;
        } else {
            const offsets = touches.map(e => e.offset);
            const minOffset = Math.min(...offsets);
            return touches.find(e => e.offset === minOffset);
        }
    }
    
    castRays() {
        this.rays = [];
        
        for (let i = 0; i < this.rayCount; i++) {
            const rayAngle = lerp(
                this.raySpread / 2,
                -this.raySpread / 2,
                this.rayCount === 1 ? 0.5 : i / (this.rayCount - 1)
            ) + this.car.angle;
            
            const start = { x: this.car.x, y: this.car.y };
            const end = {
                x: this.car.x - Math.sin(rayAngle) * this.rayLength,
                y: this.car.y - Math.cos(rayAngle) * this.rayLength
            };
            
            this.rays.push([start, end]);
        }
    }
    
    draw(ctx) {
        for (let i = 0; i < this.rayCount; i++) {
            let end = this.rays[i][1];
            
            if (this.readings[i]) {
                end = this.readings[i];
            }
            
            // Draw ray
            ctx.beginPath();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(255, 255, 0, 0.5)";
            ctx.moveTo(this.rays[i][0].x, this.rays[i][0].y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            
            // Draw hit point
            if (this.readings[i]) {
                ctx.beginPath();
                ctx.arc(end.x, end.y, 5, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
                ctx.fill();
            }
        }
    }
}

class Controls {
    constructor(type) {
        this.forward = false;
        this.left = false;
        this.right = false;
        this.reverse = false;
        
        switch (type) {
            case "KEYS":
                this.addKeyboardListeners();
                break;
            case "DUMMY":
                this.forward = true;
                break;
        }
    }
    
    addKeyboardListeners() {
        document.onkeydown = (event) => {
            switch (event.key) {
                case "ArrowUp":
                    this.forward = true;
                    break;
                case "ArrowLeft":
                    this.left = true;
                    break;
                case "ArrowRight":
                    this.right = true;
                    break;
                case "ArrowDown":
                    this.reverse = true;
                    break;
            }
        };
        
        document.onkeyup = (event) => {
            switch (event.key) {
                case "ArrowUp":
                    this.forward = false;
                    break;
                case "ArrowLeft":
                    this.left = false;
                    break;
                case "ArrowRight":
                    this.right = false;
                    break;
                case "ArrowDown":
                    this.reverse = false;
                    break;
            }
        };
    }
}
