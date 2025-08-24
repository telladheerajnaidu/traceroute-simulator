// Traceroute Simulation JavaScript
class TracerouteSimulation {
    constructor() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentHop = 0;
        this.maxHops = 30;
        this.timeout = 5000;
        this.animationSpeed = 800;
        
        // Network topology data
        this.networkData = {
            source: { ip: "192.168.1.100", name: "Your Computer", type: "source" },
            hops: [
                { ip: "192.168.1.1", name: "Gateway Router", type: "router", rtt_base: 1 },
                { ip: "10.0.1.1", name: "ISP Router 1", type: "router", rtt_base: 5 },
                { ip: "10.0.2.1", name: "ISP Router 2", type: "router", rtt_base: 12 },
                { ip: "203.0.113.1", name: "Backbone Router 1", type: "router", rtt_base: 25 },
                { ip: "203.0.113.2", name: "Backbone Router 2", type: "router", rtt_base: 35 },
                { ip: "198.51.100.1", name: "Regional Router", type: "router", rtt_base: 45 },
                { ip: "198.51.100.2", name: "Edge Router", type: "router", rtt_base: 52 }
            ],
            destination: { ip: "8.8.8.8", name: "google-public-dns-a.google.com", type: "destination", rtt_base: 58 }
        };

        this.errorScenarios = {
            tooManyHops: false,
            timeoutAtHop: false,
            timeoutHopNumber: 5,
            networkUnreachable: false,
            hostUnreachable: false
        };

        this.initializeElements();
        this.bindEvents();
        this.updateSliderValues();
    }

    initializeElements() {
        // Control elements
        this.startBtn = document.getElementById('start-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.maxHopsSlider = document.getElementById('max-hops');
        this.timeoutSlider = document.getElementById('timeout');
        this.statusIndicator = document.getElementById('status-indicator');
        this.terminalOutput = document.getElementById('terminal-output');
        this.packetsContainer = document.getElementById('packets-container');

        // Error scenario checkboxes
        this.tooManyHopsCheck = document.getElementById('too-many-hops');
        this.timeoutAtHopCheck = document.getElementById('timeout-at-hop');
        this.timeoutHopNumber = document.getElementById('timeout-hop-number');
        this.networkUnreachableCheck = document.getElementById('network-unreachable');
        this.hostUnreachableCheck = document.getElementById('host-unreachable');
    }

    bindEvents() {
        // Control buttons
        this.startBtn.addEventListener('click', () => this.startSimulation());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        this.resetBtn.addEventListener('click', () => this.resetSimulation());

        // Sliders
        this.maxHopsSlider.addEventListener('input', () => this.updateSliderValues());
        this.timeoutSlider.addEventListener('input', () => this.updateSliderValues());

        // Error scenarios
        this.tooManyHopsCheck.addEventListener('change', () => this.updateErrorScenarios());
        this.timeoutAtHopCheck.addEventListener('change', () => this.updateErrorScenarios());
        this.timeoutHopNumber.addEventListener('input', () => this.updateErrorScenarios());
        this.networkUnreachableCheck.addEventListener('change', () => this.updateErrorScenarios());
        this.hostUnreachableCheck.addEventListener('change', () => this.updateErrorScenarios());
    }

    updateSliderValues() {
        document.getElementById('max-hops-value').textContent = this.maxHopsSlider.value;
        document.getElementById('timeout-value').textContent = this.timeoutSlider.value;
        this.maxHops = parseInt(this.maxHopsSlider.value);
        this.timeout = parseInt(this.timeoutSlider.value) * 1000;
    }

    updateErrorScenarios() {
        this.errorScenarios.tooManyHops = this.tooManyHopsCheck.checked;
        this.errorScenarios.timeoutAtHop = this.timeoutAtHopCheck.checked;
        this.errorScenarios.timeoutHopNumber = parseInt(this.timeoutHopNumber.value);
        this.errorScenarios.networkUnreachable = this.networkUnreachableCheck.checked;
        this.errorScenarios.hostUnreachable = this.hostUnreachableCheck.checked;

        // Enable/disable timeout hop number input
        this.timeoutHopNumber.disabled = !this.timeoutAtHopCheck.checked;
    }

    async startSimulation() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.isPaused = false;
        this.currentHop = 0;

        this.updateControlButtons();
        this.updateStatus('Running', 'status--warning');
        this.clearTerminal();
        this.addTerminalLine(`traceroute to google.com (8.8.8.8), ${this.maxHops} hops max, 60 byte packets`);

        // Start the simulation
        this.runTraceroute();
    }

    async runTraceroute() {
        const totalHops = this.networkData.hops.length + 1; // +1 for destination
        let destinationReached = false;

        for (let ttl = 1; ttl <= this.maxHops && this.isRunning && !destinationReached; ttl++) {
            // Wait if paused
            while (this.isPaused && this.isRunning) {
                await this.sleep(100);
            }

            if (!this.isRunning) break;

            this.currentHop = ttl;
            
            // Check if we should simulate too many hops before reaching destination
            if (this.errorScenarios.tooManyHops && ttl > 15) {
                this.updateStatus('Too Many Hops', 'status--error');
                this.addTerminalLine('\n*** Too many hops - destination not reached within 30 hops ***');
                break;
            }

            const result = await this.simulateHop(ttl);
            
            // Check if we reached the destination (last hop without errors)
            if (ttl >= totalHops && result === 'success') {
                destinationReached = true;
                this.updateStatus('Complete', 'status--success');
                this.addTerminalLine('\nTraceroute complete!');
                break;
            }

            // Add delay between hops
            await this.sleep(800);
        }

        // Check for too many hops at the end
        if (!destinationReached && this.currentHop >= this.maxHops && this.isRunning) {
            this.updateStatus('Too Many Hops', 'status--error');
            this.addTerminalLine('\n*** Too many hops - destination not reached within 30 hops ***');
        }

        this.isRunning = false;
        this.updateControlButtons();
    }

    async simulateHop(ttl) {
        const hopIndex = ttl - 1;
        let targetNode, targetData;

        // Determine target (router or destination)
        if (hopIndex < this.networkData.hops.length) {
            targetNode = document.getElementById(`hop-${ttl}`);
            targetData = this.networkData.hops[hopIndex];
        } else {
            targetNode = document.getElementById('destination-node');
            targetData = this.networkData.destination;
        }

        // Highlight current hop
        this.highlightCurrentHop(ttl);

        // Animate packet to hop
        await this.animatePacketToHop(ttl);

        // Check for errors at this hop
        const errorType = this.shouldSimulateError(ttl);
        if (errorType) {
            const result = await this.handleHopError(ttl, targetData, errorType);
            this.clearHopHighlighting();
            return result;
        } else {
            // Normal response
            const result = await this.handleHopResponse(ttl, targetData);
            this.clearHopHighlighting();
            return result;
        }
    }

    shouldSimulateError(ttl) {
        if (this.errorScenarios.timeoutAtHop && ttl === this.errorScenarios.timeoutHopNumber) {
            return 'timeout';
        }
        if (this.errorScenarios.networkUnreachable && ttl === 3) {
            return 'network_unreachable';
        }
        if (this.errorScenarios.hostUnreachable && ttl >= this.networkData.hops.length + 1) {
            return 'host_unreachable';
        }
        return false;
    }

    async handleHopError(ttl, targetData, errorType) {
        let errorMsg = '';

        switch (errorType) {
            case 'timeout':
                errorMsg = `${String(ttl).padStart(2, ' ')}  * * *`;
                this.markHopTimeout(ttl);
                await this.sleep(this.timeout / 2); // Shorter timeout for demo
                break;
            case 'network_unreachable':
                const rtt = this.generateRTT(targetData.rtt_base);
                errorMsg = `${String(ttl).padStart(2, ' ')}  ${targetData.ip} (${targetData.name})  ${rtt}ms !N`;
                this.markHopUnreachable(ttl);
                await this.animateIcmpResponse(ttl);
                break;
            case 'host_unreachable':
                const hostRtt = this.generateRTT(targetData.rtt_base);
                errorMsg = `${String(ttl).padStart(2, ' ')}  ${targetData.ip} (${targetData.name})  ${hostRtt}ms !H`;
                this.markHopUnreachable(ttl);
                await this.animateIcmpResponse(ttl);
                break;
        }

        this.addTerminalLine(errorMsg);
        return 'error';
    }

    async handleHopResponse(ttl, targetData) {
        // Simulate RTT measurements (3 probes)
        const baseRtt = targetData.rtt_base;
        const rtt1 = this.generateRTT(baseRtt);
        const rtt2 = this.generateRTT(baseRtt);
        const rtt3 = this.generateRTT(baseRtt);

        // Animate ICMP response
        await this.animateIcmpResponse(ttl);

        // Mark hop as responding
        this.markHopResponding(ttl);

        // Format output line
        const outputLine = `${String(ttl).padStart(2, ' ')}  ${targetData.ip} (${targetData.name})  ${rtt1}ms  ${rtt2}ms  ${rtt3}ms`;

        this.addTerminalLine(outputLine);
        await this.sleep(200);
        return 'success';
    }

    generateRTT(baseRtt) {
        // Add some realistic variation to RTT
        const variation = 0.3; // 30% variation
        const rtt = baseRtt + (Math.random() - 0.5) * 2 * baseRtt * variation;
        return Math.max(1, Math.round(rtt * 10) / 10);
    }

    async animatePacketToHop(ttl) {
        return new Promise((resolve) => {
            const sourceElement = document.getElementById('source');
            let targetElement;
            
            if (ttl <= this.networkData.hops.length) {
                targetElement = document.getElementById(`hop-${ttl}`);
            } else {
                targetElement = document.getElementById('destination-node');
            }

            if (!sourceElement || !targetElement) {
                resolve();
                return;
            }

            // Get positions relative to the packets container
            const containerRect = this.packetsContainer.getBoundingClientRect();
            const sourceRect = sourceElement.getBoundingClientRect();
            const targetRect = targetElement.getBoundingClientRect();

            const startX = sourceRect.left - containerRect.left + sourceRect.width / 2;
            const startY = sourceRect.top - containerRect.top + sourceRect.height / 2;
            const endX = targetRect.left - containerRect.left + targetRect.width / 2;
            const endY = targetRect.top - containerRect.top + targetRect.height / 2;

            // Create packet element
            const packet = document.createElement('div');
            packet.className = 'packet probe-packet visible';
            packet.textContent = ttl; // Show TTL value
            
            packet.style.left = startX + 'px';
            packet.style.top = startY + 'px';
            
            this.packetsContainer.appendChild(packet);

            // Animate to target
            setTimeout(() => {
                packet.style.transition = `all ${this.animationSpeed}ms ease-out`;
                packet.style.left = endX + 'px';
                packet.style.top = endY + 'px';

                setTimeout(() => {
                    // Show packet expiry if TTL reached 0 at intermediate hop
                    if (ttl <= this.networkData.hops.length) {
                        packet.classList.add('expired');
                        packet.textContent = '0'; // TTL expired
                    }
                    
                    setTimeout(() => {
                        packet.remove();
                        resolve();
                    }, 300);
                }, this.animationSpeed);
            }, 100);
        });
    }

    async animateIcmpResponse(ttl) {
        return new Promise((resolve) => {
            let sourceElement;
            if (ttl <= this.networkData.hops.length) {
                sourceElement = document.getElementById(`hop-${ttl}`);
            } else {
                sourceElement = document.getElementById('destination-node');
            }
            
            const targetElement = document.getElementById('source');

            if (!sourceElement || !targetElement) {
                resolve();
                return;
            }

            const containerRect = this.packetsContainer.getBoundingClientRect();
            const sourceRect = sourceElement.getBoundingClientRect();
            const targetRect = targetElement.getBoundingClientRect();

            const startX = sourceRect.left - containerRect.left + sourceRect.width / 2;
            const startY = sourceRect.top - containerRect.top + sourceRect.height / 2;
            const endX = targetRect.left - containerRect.left + targetRect.width / 2;
            const endY = targetRect.top - containerRect.top + targetRect.height / 2;

            // Create ICMP response packet
            const icmpPacket = document.createElement('div');
            icmpPacket.className = 'packet icmp-packet visible';
            icmpPacket.textContent = '11'; // ICMP Type 11 (Time Exceeded)

            icmpPacket.style.left = startX + 'px';
            icmpPacket.style.top = startY + 'px';
            
            this.packetsContainer.appendChild(icmpPacket);

            // Animate back to source
            setTimeout(() => {
                icmpPacket.style.transition = `all ${this.animationSpeed * 0.7}ms ease-out`;
                icmpPacket.style.left = endX + 'px';
                icmpPacket.style.top = endY + 'px';

                setTimeout(() => {
                    icmpPacket.remove();
                    resolve();
                }, this.animationSpeed * 0.7);
            }, 200);
        });
    }

    highlightCurrentHop(ttl) {
        // Clear previous highlighting
        this.clearHopHighlighting();

        // Highlight current hop
        if (ttl <= this.networkData.hops.length) {
            const hopElement = document.getElementById(`hop-${ttl}`);
            if (hopElement) hopElement.classList.add('active');
        } else {
            const destElement = document.getElementById('destination-node');
            if (destElement) destElement.classList.add('active');
        }
    }

    clearHopHighlighting() {
        document.querySelectorAll('.hop-node, .network-node').forEach(node => {
            node.classList.remove('active', 'timeout', 'unreachable', 'responding');
        });
    }

    markHopTimeout(ttl) {
        if (ttl <= this.networkData.hops.length) {
            const hopElement = document.getElementById(`hop-${ttl}`);
            if (hopElement) {
                hopElement.classList.remove('active');
                hopElement.classList.add('timeout');
            }
        }
    }

    markHopUnreachable(ttl) {
        if (ttl <= this.networkData.hops.length) {
            const hopElement = document.getElementById(`hop-${ttl}`);
            if (hopElement) {
                hopElement.classList.remove('active');
                hopElement.classList.add('unreachable');
            }
        } else {
            const destElement = document.getElementById('destination-node');
            if (destElement) {
                destElement.classList.remove('active');
                destElement.classList.add('unreachable');
            }
        }
    }

    markHopResponding(ttl) {
        if (ttl <= this.networkData.hops.length) {
            const hopElement = document.getElementById(`hop-${ttl}`);
            if (hopElement) {
                hopElement.classList.remove('active');
                hopElement.classList.add('responding');
            }
        } else {
            const destElement = document.getElementById('destination-node');
            if (destElement) {
                destElement.classList.remove('active');
                destElement.classList.add('responding');
            }
        }
    }

    togglePause() {
        if (!this.isRunning) return;

        this.isPaused = !this.isPaused;
        this.updateControlButtons();
        this.updateStatus(this.isPaused ? 'Paused' : 'Running', 
                         this.isPaused ? 'status--warning' : 'status--info');
    }

    resetSimulation() {
        this.isRunning = false;
        this.isPaused = false;
        this.currentHop = 0;

        this.updateControlButtons();
        this.updateStatus('Ready', 'status--info');
        this.clearTerminal();
        this.clearHopHighlighting();
        this.clearPackets();

        // Reset terminal to initial state
        this.addTerminalLine('traceroute to google.com (8.8.8.8), 30 hops max, 60 byte packets');
    }

    updateControlButtons() {
        this.startBtn.disabled = this.isRunning;
        this.pauseBtn.disabled = !this.isRunning;
        this.pauseBtn.textContent = this.isPaused ? 'Resume' : 'Pause';

        // Update start button text
        if (this.isRunning) {
            this.startBtn.textContent = 'Running...';
        } else {
            this.startBtn.textContent = 'Start Traceroute';
        }
    }

    updateStatus(text, className) {
        const statusElement = this.statusIndicator.querySelector('.status');
        if (statusElement) {
            statusElement.textContent = text;
            statusElement.className = `status ${className}`;
        }
    }

    clearTerminal() {
        this.terminalOutput.innerHTML = '';
    }

    addTerminalLine(text, className = '') {
        const line = document.createElement('div');
        line.className = `terminal-line new-line ${className}`;
        line.textContent = text;
        this.terminalOutput.appendChild(line);
        
        // Auto-scroll to bottom
        this.terminalOutput.scrollTop = this.terminalOutput.scrollHeight;

        // Remove new-line class after animation
        setTimeout(() => {
            line.classList.remove('new-line');
        }, 300);
    }

    clearPackets() {
        this.packetsContainer.innerHTML = '';
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize simulation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const simulation = new TracerouteSimulation();
    
    // Make simulation globally accessible for debugging
    window.tracerouteSimulation = simulation;
});