/**
 * Game class for the neural network car game
 * Handles the game environment, road, traffic, and game loop
 */

class Road {
    constructor(x, width, laneCount = 3) {
        this.x = x;
        this.width = width;
        this.laneCount = laneCount;

        this.left = x - width / 2;
        this.right = x + width / 2;

        // Make the road "infinite" by extending it far beyond the screen
        const infinity = 1000000;
        this.top = -infinity;
        this.bottom = infinity;

        // Define road borders
        this.borders = [
            [{x: this.left, y: this.top}, {x: this.left, y: this.bottom}],
            [{x: this.right, y: this.top}, {x: this.right, y: this.bottom}]
        ];

        // Create checkpoints for fitness calculation
        this.checkpoints = [];
        const checkpointCount = 10;
        const checkpointSpacing = 100;

        for (let i = 1; i <= checkpointCount; i++) {
            this.checkpoints.push([
                {x: this.left, y: -i * checkpointSpacing},
                {x: this.right, y: -i * checkpointSpacing}
            ]);
        }
    }

    getLaneCenter(laneIndex) {
        const laneWidth = this.width / this.laneCount;
        return this.left + laneWidth / 2 + Math.min(laneIndex, this.laneCount - 1) * laneWidth;
    }

    draw(ctx) {
        ctx.lineWidth = 5;
        ctx.strokeStyle = "white";

        // Draw lane lines
        for (let i = 1; i <= this.laneCount - 1; i++) {
            const x = lerp(this.left, this.right, i / this.laneCount);

            // Draw dashed lines for lanes
            ctx.setLineDash([20, 20]);
            ctx.beginPath();
            ctx.moveTo(x, this.top);
            ctx.lineTo(x, this.bottom);
            ctx.stroke();
        }

        // Draw road borders
        ctx.setLineDash([]);
        this.borders.forEach(border => {
            ctx.beginPath();
            ctx.moveTo(border[0].x, border[0].y);
            ctx.lineTo(border[1].x, border[1].y);
            ctx.stroke();
        });

        // Draw checkpoints (for debugging)
        /*
        ctx.strokeStyle = "red";
        ctx.setLineDash([5, 5]);
        this.checkpoints.forEach(checkpoint => {
            ctx.beginPath();
            ctx.moveTo(checkpoint[0].x, checkpoint[0].y);
            ctx.lineTo(checkpoint[1].x, checkpoint[1].y);
            ctx.stroke();
        });
        ctx.setLineDash([]);
        */
    }
}

class Game {
    constructor(gameCanvas, networkCanvas, soundManager = null) {
        this.gameCanvas = gameCanvas;
        this.networkCanvas = networkCanvas;

        this.gameCtx = gameCanvas.getContext("2d");
        this.networkCtx = networkCanvas.getContext("2d");

        // Set canvas dimensions
        this.gameCanvas.width = this.gameCanvas.offsetWidth;
        this.gameCanvas.height = this.gameCanvas.offsetHeight;
        this.networkCanvas.width = this.networkCanvas.offsetWidth;
        this.networkCanvas.height = this.networkCanvas.offsetHeight;

        // Sound manager
        this.soundManager = soundManager;

        // Create road
        this.road = new Road(this.gameCanvas.width / 2, this.gameCanvas.width * 0.9);

        // Game settings
        this.trafficCount = 10;
        this.populationSize = 20;
        this.mutationRate = 0.1;
        this.generation = 0;
        this.bestCar = null;
        this.bestFitness = 0;

        // Create player car (controlled by arrow keys)
        this.playerCar = new Car(
            this.road.getLaneCenter(1),
            100,
            30,
            50,
            "KEYS",
            5
        );

        // Initialize AI cars and traffic
        this.cars = this.generateCars(this.populationSize);
        this.bestCar = this.cars[0];
        this.traffic = this.generateTraffic(this.trafficCount);

        // Create neural network visualizer with sound manager
        this.networkVisualizer = new NetworkVisualizer(
            this.networkCanvas,
            this.bestCar.brain,
            this.soundManager
        );

        // Animation frame ID for stopping the game loop
        this.animationFrameId = null;

        // Particle system for effects
        this.particles = [];

        // Key press visual indicators
        this.keyIndicators = {
            up: false,
            down: false,
            left: false,
            right: false
        };

        // Add key event listeners for visual indicators
        this.addKeyListeners();

        // Update UI elements
        this.updateUICounters();
    }

    addKeyListeners() {
        document.addEventListener('keydown', (event) => {
            switch(event.key) {
                case "ArrowUp":
                    this.keyIndicators.up = true;
                    break;
                case "ArrowDown":
                    this.keyIndicators.down = true;
                    break;
                case "ArrowLeft":
                    this.keyIndicators.left = true;
                    break;
                case "ArrowRight":
                    this.keyIndicators.right = true;
                    break;
            }
        });

        document.addEventListener('keyup', (event) => {
            switch(event.key) {
                case "ArrowUp":
                    this.keyIndicators.up = false;
                    break;
                case "ArrowDown":
                    this.keyIndicators.down = false;
                    break;
                case "ArrowLeft":
                    this.keyIndicators.left = false;
                    break;
                case "ArrowRight":
                    this.keyIndicators.right = false;
                    break;
            }
        });
    }

    generateCars(count) {
        const cars = [];
        for (let i = 0; i < count; i++) {
            cars.push(new Car(
                this.road.getLaneCenter(1),
                100,
                30,
                50,
                "AI"
            ));
        }
        return cars;
    }

    generateTraffic(count) {
        const traffic = [];
        const laneCount = this.road.laneCount;

        for (let i = 0; i < count; i++) {
            const lane = Math.floor(Math.random() * laneCount);
            const y = -100 - i * 150; // Space traffic vertically

            traffic.push(new Car(
                this.road.getLaneCenter(lane),
                y,
                30,
                50,
                "DUMMY",
                2 // Slower speed for traffic
            ));
        }

        return traffic;
    }

    start() {
        // Start the game loop
        this.gameLoop();
    }

    stop() {
        // Stop the game loop
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    reset() {
        this.stop();

        // Reset game state
        this.cars = this.generateCars(this.populationSize);
        this.bestCar = this.cars[0];
        this.traffic = this.generateTraffic(this.trafficCount);
        this.generation = 0;
        this.bestFitness = 0;

        // Reset player car
        this.playerCar = new Car(
            this.road.getLaneCenter(1),
            100,
            30,
            50,
            "KEYS",
            5
        );

        // Clear particles
        this.particles = [];

        // Update neural network visualizer
        this.networkVisualizer = new NetworkVisualizer(
            this.networkCanvas,
            this.bestCar.brain,
            this.soundManager
        );

        // Update UI
        this.updateUICounters();

        // Restart game
        this.start();
    }

    evolve() {
        // Find the best car from the current generation
        let bestCar = this.cars[0];
        for (let i = 1; i < this.cars.length; i++) {
            if (this.cars[i].fitness > bestCar.fitness) {
                bestCar = this.cars[i];
            }
        }

        // Update best fitness if this car is better
        if (bestCar.fitness > this.bestFitness) {
            this.bestFitness = bestCar.fitness;
        }

        // Create a new generation based on the best car
        const newCars = [];

        // Keep the best car
        const newBestCar = new Car(
            this.road.getLaneCenter(1),
            100,
            30,
            50,
            "AI"
        );
        newBestCar.brain = bestCar.brain.copy();
        newCars.push(newBestCar);

        // Create mutated versions for the rest
        for (let i = 1; i < this.populationSize; i++) {
            const car = new Car(
                this.road.getLaneCenter(1),
                100,
                30,
                50,
                "AI"
            );
            car.brain = bestCar.brain.copy();
            car.brain.mutate(this.mutationRate);
            newCars.push(car);
        }

        this.cars = newCars;
        this.bestCar = newCars[0];
        this.generation++;

        // Generate new traffic
        this.traffic = this.generateTraffic(this.trafficCount);

        // Update UI
        this.updateUICounters();
    }

    updateUICounters() {
        document.getElementById("generation-count").textContent = this.generation;
        document.getElementById("best-fitness").textContent = Math.floor(this.bestFitness);
        document.getElementById("mutation-rate-value").textContent = this.mutationRate;
        document.getElementById("population-size-value").textContent = this.populationSize;
        document.getElementById("hidden-neurons-value").textContent = this.bestCar.brain.hiddenNodes;
    }

    // Create particle effect
    createParticles(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                radius: Math.random() * 5 + 2,
                color: color,
                life: 30 + Math.random() * 20
            });
        }
    }

    // Update and draw particles
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // Update position
            p.x += p.vx;
            p.y += p.vy;

            // Reduce life
            p.life--;

            // Remove dead particles
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            // Draw particle
            this.gameCtx.beginPath();
            this.gameCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.gameCtx.fillStyle = p.color;
            this.gameCtx.globalAlpha = p.life / 50;
            this.gameCtx.fill();
            this.gameCtx.globalAlpha = 1;
        }
    }

    // Draw key indicators
    drawKeyIndicators() {
        const padding = 20;
        const size = 40;
        const spacing = 10;
        const baseX = this.gameCanvas.width - padding - size * 3 - spacing * 2;
        const baseY = this.gameCanvas.height - padding - size * 2 - spacing;

        // Draw up arrow
        this.drawArrowKey(baseX + size + spacing, baseY - size - spacing, "up", this.keyIndicators.up);

        // Draw left arrow
        this.drawArrowKey(baseX, baseY, "left", this.keyIndicators.left);

        // Draw down arrow
        this.drawArrowKey(baseX + size + spacing, baseY, "down", this.keyIndicators.down);

        // Draw right arrow
        this.drawArrowKey(baseX + size * 2 + spacing * 2, baseY, "right", this.keyIndicators.right);
    }

    // Draw a single arrow key
    drawArrowKey(x, y, direction, active) {
        const size = 40;

        // Draw key background
        this.gameCtx.beginPath();
        this.gameCtx.rect(x, y, size, size);

        if (active) {
            this.gameCtx.fillStyle = "rgba(58, 134, 255, 0.8)";
        } else {
            this.gameCtx.fillStyle = "rgba(255, 255, 255, 0.2)";
        }

        this.gameCtx.fill();
        this.gameCtx.lineWidth = 2;
        this.gameCtx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        this.gameCtx.stroke();

        // Draw arrow
        this.gameCtx.beginPath();

        const center = size / 2;
        const arrowSize = size / 3;

        switch (direction) {
            case "up":
                this.gameCtx.moveTo(x + center, y + center - arrowSize);
                this.gameCtx.lineTo(x + center + arrowSize, y + center + arrowSize);
                this.gameCtx.lineTo(x + center - arrowSize, y + center + arrowSize);
                break;
            case "down":
                this.gameCtx.moveTo(x + center, y + center + arrowSize);
                this.gameCtx.lineTo(x + center + arrowSize, y + center - arrowSize);
                this.gameCtx.lineTo(x + center - arrowSize, y + center - arrowSize);
                break;
            case "left":
                this.gameCtx.moveTo(x + center - arrowSize, y + center);
                this.gameCtx.lineTo(x + center + arrowSize, y + center - arrowSize);
                this.gameCtx.lineTo(x + center + arrowSize, y + center + arrowSize);
                break;
            case "right":
                this.gameCtx.moveTo(x + center + arrowSize, y + center);
                this.gameCtx.lineTo(x + center - arrowSize, y + center - arrowSize);
                this.gameCtx.lineTo(x + center - arrowSize, y + center + arrowSize);
                break;
        }

        this.gameCtx.closePath();
        this.gameCtx.fillStyle = "rgba(255, 255, 255, 0.9)";
        this.gameCtx.fill();
    }

    gameLoop() {
        // Update traffic
        for (let i = 0; i < this.traffic.length; i++) {
            this.traffic[i].update(this.road.borders, []);
        }

        // Update player car
        const prevDamaged = this.playerCar.damaged;
        this.playerCar.update(this.road.borders, this.traffic);

        // Check if player car just got damaged
        if (!prevDamaged && this.playerCar.damaged) {
            this.createParticles(this.playerCar.x, this.playerCar.y, 30, "rgba(255, 100, 100, 0.8)");

            // Play crash sound
            if (this.soundManager && this.soundManager.initialized) {
                this.soundManager.playCrashSound();
            }
        }

        // Update AI cars
        for (let i = 0; i < this.cars.length; i++) {
            const prevDamaged = this.cars[i].damaged;
            this.cars[i].update(this.road.borders, this.traffic);

            // Create particles if car just got damaged
            if (!prevDamaged && this.cars[i].damaged) {
                this.createParticles(this.cars[i].x, this.cars[i].y, 20, "rgba(100, 100, 255, 0.8)");
            }
        }

        // Find the best car (furthest up the road)
        this.bestCar = this.cars.find(
            c => c.y === Math.min(...this.cars.map(c => c.y))
        );

        // Determine which car to follow with the camera
        const cameraFollowCar = this.playerCar.damaged ? this.bestCar : this.playerCar;

        // Draw everything
        this.gameCanvas.height = window.innerHeight;

        this.gameCtx.save();
        this.gameCtx.translate(0, -cameraFollowCar.y + this.gameCanvas.height * 0.7);

        this.road.draw(this.gameCtx);

        // Draw traffic
        for (let i = 0; i < this.traffic.length; i++) {
            this.traffic[i].draw(this.gameCtx, "red");
        }

        // Draw AI cars with different opacity
        this.gameCtx.globalAlpha = 0.2;
        for (let i = 0; i < this.cars.length; i++) {
            if (this.cars[i] !== this.bestCar) {
                this.cars[i].draw(this.gameCtx, "blue");
            }
        }

        // Draw best AI car
        this.gameCtx.globalAlpha = 1;
        this.bestCar.draw(this.gameCtx, "blue", true);

        // Draw player car
        this.playerCar.draw(this.gameCtx, "green", true);

        // Draw particles
        this.updateParticles();

        this.gameCtx.restore();

        // Draw key indicators (not affected by camera transform)
        this.drawKeyIndicators();

        // Draw neural network visualization
        this.networkVisualizer.network = this.bestCar.brain;
        this.networkVisualizer.draw(
            this.bestCar.sensor.readings.map(s => s === null ? 0 : 1 - s.offset),
            this.bestCar.controls
        );

        // Check if all AI cars are damaged
        const allDamaged = this.cars.every(car => car.damaged);

        if (allDamaged) {
            this.evolve();
        }

        // Continue the game loop
        this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }
}
