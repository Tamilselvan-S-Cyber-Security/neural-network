/**
 * Neural Network implementation for the car game
 * This file contains the neural network class and related utility functions
 */

class NeuralNetwork {
    constructor(inputNodes, hiddenNodes, outputNodes) {
        this.inputNodes = inputNodes;
        this.hiddenNodes = hiddenNodes;
        this.outputNodes = outputNodes;

        // Initialize weights with random values
        this.weightsInputHidden = this.generateMatrix(this.hiddenNodes, this.inputNodes);
        this.weightsHiddenOutput = this.generateMatrix(this.outputNodes, this.hiddenNodes);

        // Initialize biases
        this.biasHidden = this.generateMatrix(this.hiddenNodes, 1);
        this.biasOutput = this.generateMatrix(this.outputNodes, 1);

        // Set learning rate
        this.learningRate = 0.1;
    }

    // Generate a matrix with random values
    generateMatrix(rows, cols) {
        let matrix = [];
        for (let i = 0; i < rows; i++) {
            matrix[i] = [];
            for (let j = 0; j < cols; j++) {
                matrix[i][j] = Math.random() * 2 - 1; // Values between -1 and 1
            }
        }
        return matrix;
    }

    // Activation function (sigmoid)
    sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    }

    // Feed forward the input through the network
    predict(inputArray) {
        // Convert input array to matrix
        let inputs = inputArray.map(x => [x]);

        // Calculate hidden layer
        let hidden = this.matrixMultiply(this.weightsInputHidden, inputs);
        hidden = this.matrixAdd(hidden, this.biasHidden);
        hidden = this.matrixMap(hidden, this.sigmoid);

        // Calculate output layer
        let output = this.matrixMultiply(this.weightsHiddenOutput, hidden);
        output = this.matrixAdd(output, this.biasOutput);
        output = this.matrixMap(output, this.sigmoid);

        // Convert output matrix to array
        return output.map(x => x[0]);
    }

    // Matrix multiplication
    matrixMultiply(a, b) {
        if (a[0].length !== b.length) {
            console.error("Matrices cannot be multiplied!");
            return null;
        }

        let result = [];
        for (let i = 0; i < a.length; i++) {
            result[i] = [];
            for (let j = 0; j < b[0].length; j++) {
                let sum = 0;
                for (let k = 0; k < a[0].length; k++) {
                    sum += a[i][k] * b[k][j];
                }
                result[i][j] = sum;
            }
        }
        return result;
    }

    // Matrix addition
    matrixAdd(a, b) {
        let result = [];
        for (let i = 0; i < a.length; i++) {
            result[i] = [];
            for (let j = 0; j < a[0].length; j++) {
                result[i][j] = a[i][j] + b[i][j];
            }
        }
        return result;
    }

    // Apply function to each element in matrix
    matrixMap(matrix, func) {
        let result = [];
        for (let i = 0; i < matrix.length; i++) {
            result[i] = [];
            for (let j = 0; j < matrix[0].length; j++) {
                result[i][j] = func(matrix[i][j]);
            }
        }
        return result;
    }

    // Create a copy of this neural network
    copy() {
        let newNetwork = new NeuralNetwork(this.inputNodes, this.hiddenNodes, this.outputNodes);
        newNetwork.weightsInputHidden = JSON.parse(JSON.stringify(this.weightsInputHidden));
        newNetwork.weightsHiddenOutput = JSON.parse(JSON.stringify(this.weightsHiddenOutput));
        newNetwork.biasHidden = JSON.parse(JSON.stringify(this.biasHidden));
        newNetwork.biasOutput = JSON.parse(JSON.stringify(this.biasOutput));
        return newNetwork;
    }

    // Mutate the network's weights and biases
    mutate(rate) {
        function mutateValue(val) {
            if (Math.random() < rate) {
                // Add a small random value
                return val + (Math.random() * 2 - 1) * 0.1;
            } else {
                return val;
            }
        }

        this.weightsInputHidden = this.matrixMap(this.weightsInputHidden, mutateValue);
        this.weightsHiddenOutput = this.matrixMap(this.weightsHiddenOutput, mutateValue);
        this.biasHidden = this.matrixMap(this.biasHidden, mutateValue);
        this.biasOutput = this.matrixMap(this.biasOutput, mutateValue);
    }
}

// Neural Network Visualization
class NetworkVisualizer {
    constructor(canvas, network, soundManager = null) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.network = network;

        // Set canvas dimensions
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;

        // Calculate appropriate node size based on canvas dimensions
        this.calculateVisualizationSettings();

        // Animation properties
        this.time = 0;
        this.pulseSpeed = 0.05;
        this.flowSpeed = 0.02;
        this.flowParticles = [];

        // Sound manager
        this.soundManager = soundManager;

        // Track previous activations for sound triggering
        this.prevInputs = [];
        this.prevOutputs = [];

        // Sound cooldown to prevent too many sounds
        this.soundCooldown = {
            input: 0,
            hidden: 0,
            output: 0,
            connection: 0
        };

        // Initialize flow particles
        this.initFlowParticles();
    }

    // Calculate visualization settings based on canvas size
    calculateVisualizationSettings() {
        // Set fixed dimensions for consistent visualization
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;

        // Calculate padding to center the visualization
        this.paddingX = canvasWidth * 0.1;
        this.paddingY = canvasHeight * 0.15;

        // Available space for the visualization
        const availableWidth = canvasWidth - (this.paddingX * 2);
        const availableHeight = canvasHeight - (this.paddingY * 2);

        // Adjust node radius based on canvas size
        const minDimension = Math.min(availableWidth, availableHeight);
        this.nodeRadius = Math.max(6, Math.min(12, minDimension / 30));

        // Calculate horizontal spacing between layers
        this.layerSpacing = availableWidth / 3;

        // Calculate vertical spacing between nodes
        const maxNodes = Math.max(
            this.network.inputNodes,
            this.network.hiddenNodes,
            this.network.outputNodes
        );

        // Ensure there's enough space between nodes
        this.nodeSpacing = Math.min(
            availableHeight / (maxNodes + 1),
            availableHeight / 8 // Maximum spacing
        );

        // Set animation properties based on canvas size
        this.pulseSpeed = 0.05;
        this.flowSpeed = 0.02;
        this.particleSize = Math.max(2, this.nodeRadius / 5);

        // Set font sizes based on canvas size
        this.labelFontSize = Math.max(10, Math.min(14, canvasWidth / 40));
        this.valueFontSize = Math.max(8, Math.min(12, canvasWidth / 50));
    }

    // Initialize flow particles for connection animations
    initFlowParticles() {
        this.flowParticles = [];

        const inputLayerX = this.getLayerX(1);
        const hiddenLayerX = this.getLayerX(2);
        const outputLayerX = this.getLayerX(3);

        // Input to hidden connections
        for (let i = 0; i < this.network.inputNodes; i++) {
            for (let j = 0; j < this.network.hiddenNodes; j++) {
                const weight = this.network.weightsInputHidden[j][i];
                if (Math.abs(weight) > 0.2) { // Only animate stronger connections
                    this.flowParticles.push({
                        startX: inputLayerX,
                        startY: this.getNodeY(i, this.network.inputNodes),
                        endX: hiddenLayerX,
                        endY: this.getNodeY(j, this.network.hiddenNodes),
                        progress: Math.random(), // Random starting position
                        weight: weight,
                        speed: this.flowSpeed * (0.5 + Math.abs(weight))
                    });
                }
            }
        }

        // Hidden to output connections
        for (let i = 0; i < this.network.hiddenNodes; i++) {
            for (let j = 0; j < this.network.outputNodes; j++) {
                const weight = this.network.weightsHiddenOutput[j][i];
                if (Math.abs(weight) > 0.2) { // Only animate stronger connections
                    this.flowParticles.push({
                        startX: hiddenLayerX,
                        startY: this.getNodeY(i, this.network.hiddenNodes),
                        endX: outputLayerX,
                        endY: this.getNodeY(j, this.network.outputNodes),
                        progress: Math.random(), // Random starting position
                        weight: weight,
                        speed: this.flowSpeed * (0.5 + Math.abs(weight))
                    });
                }
            }
        }
    }

    // Draw the neural network
    draw(inputs, outputs) {
        // Check if canvas dimensions have changed
        if (this.canvas.width !== this.canvas.offsetWidth ||
            this.canvas.height !== this.canvas.offsetHeight) {

            // Update canvas dimensions
            this.canvas.width = this.canvas.offsetWidth;
            this.canvas.height = this.canvas.offsetHeight;

            // Recalculate visualization settings
            this.calculateVisualizationSettings();

            // Reinitialize flow particles with new positions
            this.initFlowParticles();
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update animation time
        this.time += 0.016; // Approximately 60fps

        // Update sound cooldowns
        for (const key in this.soundCooldown) {
            if (this.soundCooldown[key] > 0) {
                this.soundCooldown[key] -= 1;
            }
        }

        // Draw background glow effect
        this.drawBackgroundGlow();

        // Draw connections first (so they appear behind nodes)
        this.drawConnections();

        // Draw flow particles
        this.updateAndDrawFlowParticles();

        // Draw nodes
        this.drawInputLayer(inputs);
        this.drawHiddenLayer();
        this.drawOutputLayer(outputs);

        // Draw layer labels
        this.drawLayerLabels();

        // Play sounds based on neural network activity
        this.playSounds(inputs, outputs);

        // Store current activations for next frame comparison
        this.prevInputs = inputs ? [...inputs] : [];

        // Convert controls object to array if needed
        if (outputs) {
            if (Array.isArray(outputs)) {
                this.prevOutputs = [...outputs];
            } else if (typeof outputs === 'object') {
                // If outputs is a controls object, convert to array
                this.prevOutputs = [
                    outputs.forward ? 1 : 0,
                    outputs.left ? 1 : 0,
                    outputs.right ? 1 : 0,
                    outputs.reverse ? 1 : 0
                ];
            } else {
                this.prevOutputs = [];
            }
        } else {
            this.prevOutputs = [];
        }
    }

    // Play sounds based on neural network activity
    playSounds(inputs, outputs) {
        if (!this.soundManager || !this.soundManager.initialized) return;

        // Play sounds for significant input changes
        if (inputs && this.prevInputs.length > 0 && this.soundCooldown.input <= 0) {
            for (let i = 0; i < inputs.length; i++) {
                // Check if input has changed significantly
                if (Math.abs(inputs[i] - (this.prevInputs[i] || 0)) > 0.3) {
                    this.soundManager.playNeuronActivation('input', i, inputs[i]);
                    this.soundCooldown.input = 5; // Cooldown to prevent too many sounds
                    break; // Only play one input sound at a time
                }
            }
        }

        // Play sounds for active outputs
        if (outputs && this.prevOutputs.length > 0 && this.soundCooldown.output <= 0) {
            // Convert controls object to array if needed
            let outputArray;
            if (Array.isArray(outputs)) {
                outputArray = outputs;
            } else if (typeof outputs === 'object') {
                // If outputs is a controls object, convert to array
                outputArray = [
                    outputs.forward ? 1 : 0,
                    outputs.left ? 1 : 0,
                    outputs.right ? 1 : 0,
                    outputs.reverse ? 1 : 0
                ];
            } else {
                return; // Invalid outputs format
            }

            // Check if any output has changed from inactive to active
            const newlyActive = outputArray.some((output, i) =>
                output > 0.5 && (this.prevOutputs[i] || 0) <= 0.5
            );

            if (newlyActive) {
                this.soundManager.playDecisionChord(outputArray);
                this.soundCooldown.output = 10; // Longer cooldown for output sounds
            }
        }

        // Occasionally play connection sounds
        if (this.soundCooldown.connection <= 0 && Math.random() < 0.05) {
            // Pick a random strong connection
            const strongConnections = this.flowParticles.filter(p => Math.abs(p.weight) > 0.5);
            if (strongConnections.length > 0) {
                const randomConnection = strongConnections[Math.floor(Math.random() * strongConnections.length)];
                this.soundManager.playConnectionActivation(randomConnection.weight);
                this.soundCooldown.connection = 3;
            }
        }
    }

    // Draw labels for each layer
    drawLayerLabels() {
        this.ctx.font = `${this.labelFontSize + 2}px Arial`;
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        this.ctx.textAlign = "center";

        // Input layer label
        this.ctx.fillText("Sensors", this.getLayerX(1), this.paddingY / 2);

        // Hidden layer label
        this.ctx.fillText("Hidden Layer", this.getLayerX(2), this.paddingY / 2);

        // Output layer label
        this.ctx.fillText("Controls", this.getLayerX(3), this.paddingY / 2);
    }

    // Draw background glow effect
    drawBackgroundGlow() {
        // Create radial gradient
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 10,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width / 1.5
        );

        // Pulsing effect
        const pulse = 0.05 + 0.03 * Math.sin(this.time * this.pulseSpeed * 2);

        gradient.addColorStop(0, `rgba(58, 134, 255, ${pulse})`);
        gradient.addColorStop(0.5, `rgba(131, 56, 236, ${pulse * 0.6})`);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Update and draw flow particles
    updateAndDrawFlowParticles() {
        for (let i = 0; i < this.flowParticles.length; i++) {
            const p = this.flowParticles[i];

            // Update progress
            p.progress += p.speed;
            if (p.progress > 1) {
                p.progress = 0;
            }

            // Calculate current position
            const x = p.startX + (p.endX - p.startX) * p.progress;
            const y = p.startY + (p.endY - p.startY) * p.progress;

            // Draw particle
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);

            if (p.weight > 0) {
                this.ctx.fillStyle = `rgba(58, 134, 255, ${0.7 * (1 - p.progress * 0.5)})`;
            } else {
                this.ctx.fillStyle = `rgba(255, 0, 110, ${0.7 * (1 - p.progress * 0.5)})`;
            }

            this.ctx.fill();

            // Draw trail
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);

            // Calculate trail end point (going backwards)
            const trailLength = 0.1; // 10% of the path
            const trailProgress = Math.max(0, p.progress - trailLength);
            const trailX = p.startX + (p.endX - p.startX) * trailProgress;
            const trailY = p.startY + (p.endY - p.startY) * trailProgress;

            this.ctx.lineTo(trailX, trailY);
            this.ctx.lineWidth = 2;

            if (p.weight > 0) {
                this.ctx.strokeStyle = `rgba(58, 134, 255, ${0.4 * (1 - p.progress * 0.5)})`;
            } else {
                this.ctx.strokeStyle = `rgba(255, 0, 110, ${0.4 * (1 - p.progress * 0.5)})`;
            }

            this.ctx.stroke();
        }
    }

    // Draw connections between nodes
    drawConnections() {
        // Input to hidden connections
        const inputLayerX = this.getLayerX(1);
        const hiddenLayerX = this.getLayerX(2);
        const outputLayerX = this.getLayerX(3);

        // Input to hidden connections
        for (let i = 0; i < this.network.inputNodes; i++) {
            for (let j = 0; j < this.network.hiddenNodes; j++) {
                const weight = this.network.weightsInputHidden[j][i];
                this.drawConnection(
                    inputLayerX,
                    this.getNodeY(i, this.network.inputNodes),
                    hiddenLayerX,
                    this.getNodeY(j, this.network.hiddenNodes),
                    weight
                );
            }
        }

        // Hidden to output connections
        for (let i = 0; i < this.network.hiddenNodes; i++) {
            for (let j = 0; j < this.network.outputNodes; j++) {
                const weight = this.network.weightsHiddenOutput[j][i];
                this.drawConnection(
                    hiddenLayerX,
                    this.getNodeY(i, this.network.hiddenNodes),
                    outputLayerX,
                    this.getNodeY(j, this.network.outputNodes),
                    weight
                );
            }
        }
    }

    // Draw a connection line with color based on weight
    drawConnection(x1, y1, x2, y2, weight) {
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);

        // Line width based on weight strength
        const absWeight = Math.abs(weight);
        this.ctx.lineWidth = absWeight * 3;

        // Color based on positive/negative weight
        if (weight > 0) {
            this.ctx.strokeStyle = `rgba(58, 134, 255, ${absWeight})`;
        } else {
            this.ctx.strokeStyle = `rgba(255, 0, 110, ${absWeight})`;
        }

        this.ctx.stroke();
    }

    // Calculate X position for a layer
    getLayerX(layerIndex) {
        return this.paddingX + (layerIndex * this.layerSpacing);
    }

    // Calculate Y position for a node in a layer
    getNodeY(index, totalNodes) {
        // Center nodes vertically with padding
        const startY = this.paddingY + ((this.canvas.height - (2 * this.paddingY)) - (totalNodes - 1) * this.nodeSpacing) / 2;
        return startY + index * this.nodeSpacing;
    }

    // Draw input layer nodes
    drawInputLayer(inputs = []) {
        const sensorLabels = ["Left", "Left-Fwd", "Forward", "Right-Fwd", "Right"];
        const layerX = this.getLayerX(1);

        for (let i = 0; i < this.network.inputNodes; i++) {
            const y = this.getNodeY(i, this.network.inputNodes);

            // Use input value for node activation if available
            const activation = inputs[i] !== undefined ? inputs[i] : 0.5;
            this.drawNode(layerX, y, activation);

            // Draw sensor label
            if (i < sensorLabels.length) {
                this.ctx.font = `${this.labelFontSize}px Arial`;
                this.ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
                this.ctx.textAlign = "right";
                this.ctx.fillText(sensorLabels[i], layerX - this.nodeRadius - 10, y + 4);

                // Draw sensor value
                if (inputs[i] !== undefined) {
                    const value = Math.round(inputs[i] * 100) / 100;
                    this.ctx.font = `${this.valueFontSize}px Arial`;
                    this.ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
                    this.ctx.fillText(value.toFixed(2), layerX - this.nodeRadius - 10, y + 18);
                }
            }
        }
    }

    // Draw hidden layer nodes
    drawHiddenLayer() {
        const layerX = this.getLayerX(2);

        for (let i = 0; i < this.network.hiddenNodes; i++) {
            const y = this.getNodeY(i, this.network.hiddenNodes);
            this.drawNode(layerX, y, 0.5); // Default activation

            // Draw node number
            this.ctx.font = `${this.valueFontSize}px Arial`;
            this.ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            this.ctx.textAlign = "center";
            this.ctx.fillText(`H${i+1}`, layerX, y + this.nodeRadius + 15);
        }
    }

    // Draw output layer nodes
    drawOutputLayer(outputs = []) {
        const outputLabels = ["Forward", "Left", "Right", "Reverse"];
        const layerX = this.getLayerX(3);

        // Convert controls object to array if needed
        let outputArray;
        if (Array.isArray(outputs)) {
            outputArray = outputs;
        } else if (typeof outputs === 'object' && outputs !== null) {
            // If outputs is a controls object, convert to array
            outputArray = [
                outputs.forward ? 1 : 0,
                outputs.left ? 1 : 0,
                outputs.right ? 1 : 0,
                outputs.reverse ? 1 : 0
            ];
        } else {
            outputArray = [];
        }

        for (let i = 0; i < this.network.outputNodes; i++) {
            const y = this.getNodeY(i, this.network.outputNodes);

            // Use output value for node activation if available
            const activation = outputArray[i] !== undefined ? outputArray[i] : 0.5;

            // Draw node with highlight for active outputs
            const isActive = activation > 0.5;
            this.drawNode(layerX, y, activation, isActive);

            // Draw output label
            if (i < outputLabels.length) {
                this.ctx.font = `${this.labelFontSize}px Arial`;
                this.ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
                this.ctx.textAlign = "left";
                this.ctx.fillText(outputLabels[i], layerX + this.nodeRadius + 10, y + 4);

                // Draw activation value
                if (outputArray[i] !== undefined) {
                    const value = Math.round(outputArray[i] * 100) / 100;
                    this.ctx.font = `${this.valueFontSize}px Arial`;

                    // Color based on activation level
                    if (isActive) {
                        this.ctx.fillStyle = "rgba(100, 255, 100, 0.8)";
                    } else {
                        this.ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
                    }

                    this.ctx.fillText(value.toFixed(2), layerX + this.nodeRadius + 10, y + 18);

                    // Draw activation bar
                    const barWidth = 30;
                    const barHeight = 4;
                    const barX = layerX + this.nodeRadius + 10;
                    const barY = y + 24;

                    // Background bar
                    this.ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
                    this.ctx.fillRect(barX, barY, barWidth, barHeight);

                    // Filled portion
                    this.ctx.fillStyle = isActive ?
                        "rgba(100, 255, 100, 0.8)" :
                        "rgba(255, 255, 255, 0.5)";
                    this.ctx.fillRect(barX, barY, barWidth * activation, barHeight);
                }
            }
        }
    }

    // Draw a single node
    drawNode(x, y, activation, isActive = false) {
        // Add pulsing effect based on activation
        const pulseSpeed = isActive ? 5 : 3;
        const pulseSize = 1 + 0.2 * activation * Math.sin(this.time * pulseSpeed);
        const glowSize = this.nodeRadius * 1.8;

        // Choose color based on activation and active state
        let primaryColor, secondaryColor;
        if (isActive) {
            // Green for active outputs
            primaryColor = [100, 255, 100];
            secondaryColor = [58, 200, 100];
        } else {
            // Blue for normal nodes
            primaryColor = [58, 134, 255];
            secondaryColor = [131, 56, 236];
        }

        // Draw outer glow with pulsing effect
        const glowOpacity = 0.3 + 0.2 * Math.sin(this.time * 2);
        const glowGradient = this.ctx.createRadialGradient(x, y, this.nodeRadius * 0.8, x, y, glowSize);
        glowGradient.addColorStop(0, `rgba(${primaryColor[0]}, ${primaryColor[1]}, ${primaryColor[2]}, ${glowOpacity * activation})`);
        glowGradient.addColorStop(1, `rgba(${primaryColor[0]}, ${primaryColor[1]}, ${primaryColor[2]}, 0)`);

        this.ctx.beginPath();
        this.ctx.arc(x, y, glowSize, 0, Math.PI * 2);
        this.ctx.fillStyle = glowGradient;
        this.ctx.fill();

        // Draw node circle with pulse effect
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.nodeRadius * pulseSize, 0, Math.PI * 2);

        // Create gradient based on activation
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, this.nodeRadius * pulseSize);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${activation})`);
        gradient.addColorStop(1, `rgba(${secondaryColor[0]}, ${secondaryColor[1]}, ${secondaryColor[2]}, ${activation * 0.7})`);

        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        // Draw node border with glass effect
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = isActive ?
            'rgba(100, 255, 100, 0.8)' :
            'rgba(255, 255, 255, 0.8)';
        this.ctx.stroke();

        // Add highlight for glass effect
        this.ctx.beginPath();
        this.ctx.arc(x - this.nodeRadius * 0.3, y - this.nodeRadius * 0.3, this.nodeRadius * 0.2, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * activation})`;
        this.ctx.fill();

        // Add activation ring for active nodes
        if (isActive) {
            this.ctx.beginPath();
            this.ctx.arc(x, y, this.nodeRadius * 1.3, 0, Math.PI * 2);
            this.ctx.lineWidth = 1;
            this.ctx.strokeStyle = `rgba(100, 255, 100, ${0.3 + 0.2 * Math.sin(this.time * 5)})`;
            this.ctx.stroke();
        }
    }
}
