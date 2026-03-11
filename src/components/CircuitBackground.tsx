'use client';
'use no memo';

import { useEffect, useRef } from 'react';

interface CircuitNode {
    id: string; // Unique string for Set membership
    x: number;
    y: number;
    neighbors: CircuitNode[]; // Adjacency list
    occupied: boolean; // True if a dot is currently using or about to use this node
}

interface WireSegment {
    x1: number; y1: number;
    x2: number; y2: number;
    drawProgress: number; // 0 to 1
    drawSpeed: number;
}

interface Pulse {
    path: CircuitNode[];
    currentSegmentIndex: number;
    segmentProgress: number; // 0 to 1 along current segment
    speed: number;
}

const SPACING = 85;
const LINE_COLOR = 'rgba(90,90,90,0.45)';
const DOT_COLOR = 'rgba(70,70,70,0.65)';
const PULSE_COLOR = '#333';
const DOT_R = 3;
const PULSE_R = 4.5;
const MAX_PULSES = 15; // Limit active pulses for the "half density/slow" feel

function buildGraph(w: number, h: number): { nodes: CircuitNode[]; wires: WireSegment[]; grid: (CircuitNode | null)[][] } {
    const cols = Math.ceil(w / SPACING) + 2;
    const rows = Math.ceil(h / SPACING) + 2;

    const grid: (CircuitNode | null)[][] = [];
    const nodes: CircuitNode[] = [];

    // 1. Create Nodes
    for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
            if (Math.random() < 0.40) {
                grid[r][c] = null;
                continue;
            }
            const node: CircuitNode = {
                id: `${r},${c}`,
                x: c * SPACING - SPACING + (Math.random() * 8 - 4),
                y: r * SPACING - SPACING + (Math.random() * 8 - 4),
                neighbors: [],
                occupied: false
            };
            grid[r][c] = node;
            nodes.push(node);
        }
    }

    const wires: WireSegment[] = [];

    // 2. Connect neighbors (Right and Down) and create wires
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const node = grid[r][c];
            if (!node) continue;

            const connect = (neighbor: CircuitNode) => {
                node.neighbors.push(neighbor);
                neighbor.neighbors.push(node);
                wires.push({
                    x1: node.x, y1: node.y,
                    x2: neighbor.x, y2: neighbor.y,
                    drawProgress: Math.random(),
                    drawSpeed: (0.003 + Math.random() * 0.004) * 0.5
                });
            };

            if (c + 1 < cols && grid[r][c + 1]) connect(grid[r][c + 1]!);
            if (r + 1 < rows && grid[r + 1]?.[c]) connect(grid[r + 1][c]!);
        }
    }

    return { nodes, wires, grid };
}

// Generate a random path of specified length starting from a given node.
// Ensures it doesn't self-intersect or use currently occupied nodes.
function generatePath(startNode: CircuitNode, minLength: number, maxLength: number): CircuitNode[] | null {
    if (startNode.occupied) return null;

    const path: CircuitNode[] = [startNode];
    const targetLength = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    const visited = new Set<string>();
    visited.add(startNode.id);

    let current = startNode;

    for (let i = 1; i < targetLength; i++) {
        // Find valid neighbors: not visited in this path, and not currently occupied by another pulse
        const validNeighbors = current.neighbors.filter(n => !visited.has(n.id) && !n.occupied);

        if (validNeighbors.length === 0) {
            // Dead end, return the path we have so far if it meets minimum length, else fail
            if (path.length >= minLength) break;
            return null;
        }

        const next = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
        path.push(next);
        visited.add(next.id);
        current = next;
    }

    // Mark the entire path as occupied so other pulses won't intersect it
    path.forEach(n => n.occupied = true);
    return path;
}

export function CircuitBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = 0;
        let height = 0;
        let nodes: CircuitNode[] = [];
        let wires: WireSegment[] = [];
        let pulses: Pulse[] = [];

        const setup = () => {
            width = canvas.offsetWidth || window.innerWidth;
            height = canvas.offsetHeight || window.innerHeight;
            canvas.width = width;
            canvas.height = height;

            const graph = buildGraph(width, height);
            nodes = graph.nodes;
            wires = graph.wires;
            pulses = []; // Reset pulses on resize
        };

        setup();

        const onResize = () => setup();
        window.addEventListener('resize', onResize);

        const trySpawnPulse = () => {
            if (pulses.length >= MAX_PULSES) return;
            if (nodes.length === 0) return;

            // Pick a random starting node
            const startNode = nodes[Math.floor(Math.random() * nodes.length)];

            // Try to generate a path length of 3 to 6 nodes
            const path = generatePath(startNode, 3, 6);
            if (path) {
                pulses.push({
                    path,
                    currentSegmentIndex: 0,
                    segmentProgress: 0,
                    speed: (0.003 + Math.random() * 0.005) * 0.35 // Slow travel speed
                });
            }
        };

        const draw = () => {
            ctx.clearRect(0, 0, width, height);

            // 1. Draw Wires (Background Grid)
            for (const w of wires) {
                if (w.drawProgress < 1) {
                    w.drawProgress = Math.min(1, w.drawProgress + w.drawSpeed);
                }
                const ex = w.x1 + (w.x2 - w.x1) * w.drawProgress;
                const ey = w.y1 + (w.y2 - w.y1) * w.drawProgress;

                ctx.beginPath();
                ctx.moveTo(w.x1, w.y1);
                ctx.lineTo(ex, ey);
                ctx.strokeStyle = LINE_COLOR;
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // 2. Draw Fixed Node Dots
            for (const n of nodes) {
                ctx.beginPath();
                ctx.arc(n.x, n.y, DOT_R, 0, Math.PI * 2);
                ctx.fillStyle = DOT_COLOR;
                ctx.fill();
            }

            // 3. Update & Draw Travelling Pulses
            // Randomly attempt to spawn a new pulse occasionally
            if (Math.random() < 0.02) trySpawnPulse();

            for (let i = pulses.length - 1; i >= 0; i--) {
                const p = pulses[i];

                const fromNode = p.path[p.currentSegmentIndex];
                const toNode = p.path[p.currentSegmentIndex + 1];

                // Advance the pulse
                p.segmentProgress += p.speed;

                if (p.segmentProgress >= 1) {
                    // Segment completed
                    // Free the starting node since the pulse has left it
                    fromNode.occupied = false;

                    p.currentSegmentIndex++;
                    p.segmentProgress = 0;

                    if (p.currentSegmentIndex >= p.path.length - 1) {
                        // Pulse reached the end of its path
                        toNode.occupied = false; // Free the final node
                        pulses.splice(i, 1);
                        continue;
                    }
                } else {
                    // Calculate current position
                    const px = fromNode.x + (toNode.x - fromNode.x) * p.segmentProgress;
                    const py = fromNode.y + (toNode.y - fromNode.y) * p.segmentProgress;

                    // Draw Glow
                    const grd = ctx.createRadialGradient(px, py, 0, px, py, PULSE_R * 3);
                    grd.addColorStop(0, 'rgba(50,50,50,0.6)');
                    grd.addColorStop(1, 'rgba(50,50,50,0)');
                    ctx.beginPath();
                    ctx.arc(px, py, PULSE_R * 3, 0, Math.PI * 2);
                    ctx.fillStyle = grd;
                    ctx.fill();

                    // Draw Core Dot
                    ctx.beginPath();
                    ctx.arc(px, py, PULSE_R, 0, Math.PI * 2);
                    ctx.fillStyle = PULSE_COLOR;
                    ctx.fill();
                }
            }

            rafRef.current = requestAnimationFrame(draw);
        };

        rafRef.current = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', onResize);

            // Clean up node occupations on unmount
            nodes.forEach(n => n.occupied = false);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                display: 'block',
                zIndex: 0,
                pointerEvents: 'none',
            }}
        />
    );
}
