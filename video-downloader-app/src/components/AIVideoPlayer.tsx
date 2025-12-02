import { useEffect, useRef } from 'react';
import { Download, Brain } from 'lucide-react';

interface AIVideoPlayerProps {
  className?: string;
  onEnded?: () => void;
}

export const AIVideoPlayer = ({ className = '', onEnded }: AIVideoPlayerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number | null>(null);
  
  // Initialize startTime in useEffect to avoid impure function during render
  useEffect(() => {
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Animation state
    let animationTime = 0;
    const duration = 15; // 15 seconds

    // AI Intelligence Nodes - representing AI thinking/processing
    const aiNodes: Array<{
      x: number;
      y: number;
      radius: number;
      pulse: number;
      connections: Array<{ target: number; strength: number; pulse: number }>;
      intelligence: number;
      color: string;
    }> = [];

    // Create AI intelligence network
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Central AI Core
    aiNodes.push({
      x: centerX,
      y: centerY - 80,
      radius: 35,
      pulse: 0,
      connections: [],
      intelligence: 1,
      color: '#667eea',
    });

    // Surrounding intelligence nodes
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const distance = 120 + Math.random() * 40;
      aiNodes.push({
        x: centerX + Math.cos(angle) * distance,
        y: centerY - 80 + Math.sin(angle) * distance,
        radius: 12 + Math.random() * 8,
        pulse: Math.random() * Math.PI * 2,
        connections: [],
        intelligence: 0.5 + Math.random() * 0.5,
        color: `hsl(${240 + Math.random() * 60}, 70%, ${50 + Math.random() * 30}%)`,
      });
    }

    // Create connections from outer nodes to core
    aiNodes.forEach((node, i) => {
      if (i > 0) {
        node.connections.push({
          target: 0,
          strength: 0.5 + Math.random() * 0.5,
          pulse: Math.random() * Math.PI * 2,
        });
      }
    });

    // Data streams from platforms
    const dataStreams: Array<{
      x: number;
      y: number;
      targetX: number;
      targetY: number;
      progress: number;
      speed: number;
      color: string;
      size: number;
      particles: Array<{ x: number; y: number; life: number }>;
    }> = [];

    // AI Thought particles - representing AI thinking
    const thoughtParticles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
      color: string;
    }> = [];

    // AI Analysis waves
    const analysisWaves: Array<{
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      life: number;
      color: string;
    }> = [];

    const createDataStream = (fromX: number, fromY: number, toX: number, toY: number, color: string) => {
      dataStreams.push({
        x: fromX,
        y: fromY,
        targetX: toX,
        targetY: toY,
        progress: 0,
        speed: 0.02 + Math.random() * 0.02,
        color,
        size: 4 + Math.random() * 3,
        particles: [],
      });
    };

    const createThoughtParticle = (x: number, y: number) => {
      thoughtParticles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 0,
        maxLife: 60 + Math.random() * 40,
        size: 2 + Math.random() * 3,
        color: `hsl(${240 + Math.random() * 60}, 70%, ${60 + Math.random() * 30}%)`,
      });
    };

    const createAnalysisWave = (x: number, y: number) => {
      analysisWaves.push({
        x,
        y,
        radius: 0,
        maxRadius: 150 + Math.random() * 100,
        life: 0,
        color: `rgba(102, 126, 234, ${0.3 + Math.random() * 0.2})`,
      });
    };

    // Holographic depth layers
    const drawHolographicBackground = () => {
      // Deep grid
      ctx.strokeStyle = 'rgba(102, 126, 234, 0.08)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Depth layers with parallax effect
      for (let layer = 0; layer < 3; layer++) {
        const offset = (animationTime * (layer + 1) * 10) % (gridSize * 2);
        ctx.strokeStyle = `rgba(118, 75, 162, ${0.05 - layer * 0.01})`;
        ctx.beginPath();
        for (let x = -offset; x < canvas.width; x += gridSize * 2) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
        }
        ctx.stroke();
      }
    };

    const animate = () => {
      const currentTime = (Date.now() - startTimeRef.current) / 1000;
      animationTime = currentTime;

      // Reset after 15 seconds
      if (currentTime >= duration) {
        startTimeRef.current = Date.now();
        animationTime = 0;
        dataStreams.length = 0;
        thoughtParticles.length = 0;
        analysisWaves.length = 0;
        if (onEnded) onEnded();
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw holographic background
      drawHolographicBackground();

      // Draw gradient background with depth
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        Math.max(canvas.width, canvas.height) * 0.8
      );
      gradient.addColorStop(0, 'rgba(102, 126, 234, 0.25)');
      gradient.addColorStop(0.4, 'rgba(118, 75, 162, 0.15)');
      gradient.addColorStop(0.8, 'rgba(236, 72, 153, 0.1)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // YouTube platform (left) - appears at 1 second
      if (animationTime >= 1) {
        const youtubeX = canvas.width * 0.15;
        const youtubeY = centerY;
        const scale = Math.min(1, (animationTime - 1) * 2);
        const glow = Math.sin(animationTime * 5) * 0.2 + 0.8;
        
        // Multiple glow layers for depth
        for (let i = 3; i >= 0; i--) {
          const glowGrad = ctx.createRadialGradient(youtubeX, youtubeY, 0, youtubeX, youtubeY, 90 - i * 15);
          glowGrad.addColorStop(0, `rgba(255, 0, 0, ${(glow * (0.4 - i * 0.1)) * scale})`);
          glowGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(youtubeX, youtubeY, 90 - i * 15, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Glassmorphic bubble
        ctx.save();
        ctx.translate(youtubeX, youtubeY);
        ctx.scale(scale, scale);
        
        // Outer glass layer
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.beginPath();
        ctx.arc(0, 0, 75, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner glass layer
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.arc(0, 0, 65, 0, Math.PI * 2);
        ctx.fill();
        
        // Glowing border
        ctx.strokeStyle = `rgba(255, 0, 0, ${glow * 0.9})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 70, 0, Math.PI * 2);
        ctx.stroke();
        
        // YouTube play icon
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.moveTo(-18, -18);
        ctx.lineTo(-18, 18);
        ctx.lineTo(28, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
        
        // Platform label with holographic effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FF0000';
        ctx.fillText('YouTube', youtubeX, youtubeY + 85);
        ctx.shadowBlur = 0;

        // Create data streams to AI
        if (animationTime >= 2 && Math.random() < 0.15) {
          createDataStream(youtubeX, youtubeY, centerX, centerY - 80, '#FF0000');
        }
      }

      // TikTok platform (right) - appears at 2 seconds
      if (animationTime >= 2) {
        const tiktokX = canvas.width * 0.85;
        const tiktokY = centerY;
        const scale = Math.min(1, (animationTime - 2) * 2);
        const glow = Math.sin(animationTime * 5 + Math.PI) * 0.2 + 0.8;
        
        // Multiple glow layers
        for (let i = 3; i >= 0; i--) {
          const glowGrad = ctx.createRadialGradient(tiktokX, tiktokY, 0, tiktokX, tiktokY, 90 - i * 15);
          glowGrad.addColorStop(0, `rgba(255, 255, 255, ${(glow * (0.5 - i * 0.1)) * scale})`);
          glowGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(tiktokX, tiktokY, 90 - i * 15, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.save();
        ctx.translate(tiktokX, tiktokY);
        ctx.scale(scale, scale);
        
        // Glassmorphic bubble
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.beginPath();
        ctx.arc(0, 0, 75, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, 65, 0, Math.PI * 2);
        ctx.fill();
        
        // Glowing border
        ctx.strokeStyle = `rgba(255, 255, 255, ${glow * 0.9})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, 70, 0, Math.PI * 2);
        ctx.stroke();
        
        // TikTok music note
        ctx.fillStyle = 'white';
        ctx.font = 'bold 55px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♪', 0, 0);
        
        ctx.restore();
        
        // Platform label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FFFFFF';
        ctx.fillText('TikTok', tiktokX, tiktokY + 85);
        ctx.shadowBlur = 0;

        // Create data streams to AI
        if (animationTime >= 3 && Math.random() < 0.15) {
          createDataStream(tiktokX, tiktokY, centerX, centerY - 80, '#FFFFFF');
        }
      }

      // AI Intelligence Network - appears at 3 seconds
      if (animationTime >= 3) {
        const aiOpacity = Math.min(1, (animationTime - 3) * 0.8);
        
        // Draw AI connections with intelligence flow
        aiNodes.forEach((node, i) => {
          node.connections.forEach((conn) => {
            const target = aiNodes[conn.target];
            if (target) {
              const pulse = Math.sin(animationTime * 3 + conn.pulse) * 0.3 + 0.7;
              const strength = conn.strength * aiOpacity * pulse;
              
              // Intelligence flow gradient
              const gradient = ctx.createLinearGradient(node.x, node.y, target.x, target.y);
              gradient.addColorStop(0, `rgba(102, 126, 234, ${strength * 0.4})`);
              gradient.addColorStop(0.5, `rgba(118, 75, 162, ${strength * 0.6})`);
              gradient.addColorStop(1, `rgba(236, 72, 153, ${strength * 0.4})`);
              
              ctx.strokeStyle = gradient;
              ctx.lineWidth = 2 * strength;
              ctx.beginPath();
              ctx.moveTo(node.x, node.y);
              ctx.lineTo(target.x, target.y);
              ctx.stroke();
              
              // Data particles along connection
              if (Math.random() < 0.3) {
                const progress = Math.random();
                const px = node.x + (target.x - node.x) * progress;
                const py = node.y + (target.y - node.y) * progress;
                ctx.fillStyle = `rgba(102, 126, 234, ${strength})`;
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          });
        });

        // Draw AI nodes with intelligence visualization
        aiNodes.forEach((node, i) => {
          node.pulse += 0.05;
          const pulse = Math.sin(animationTime * 4 + node.pulse) * 0.25 + 1;
          const size = node.radius * pulse;
          const intelligence = node.intelligence * aiOpacity;
          
          // Outer intelligence glow
          for (let j = 3; j >= 0; j--) {
            const glowGrad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, size * (1.5 + j * 0.3));
            glowGrad.addColorStop(0, `${node.color}${Math.floor(intelligence * (0.4 - j * 0.1) * 255).toString(16).padStart(2, '0')}`);
            glowGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.arc(node.x, node.y, size * (1.5 + j * 0.3), 0, Math.PI * 2);
            ctx.fill();
          }
          
          // Glassmorphic bubble
          ctx.fillStyle = `rgba(255, 255, 255, ${intelligence * 0.15})`;
          ctx.beginPath();
          ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
          ctx.fill();
          
          // Intelligence border
          ctx.strokeStyle = `${node.color}${Math.floor(intelligence * 255).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
          ctx.stroke();
          
          // Intelligence core
          ctx.fillStyle = `${node.color}${Math.floor(intelligence * 255).toString(16).padStart(2, '0')}`;
          ctx.beginPath();
          ctx.arc(node.x, node.y, size * 0.5, 0, Math.PI * 2);
          ctx.fill();
          
          // Create thought particles from active nodes
          if (i === 0 && Math.random() < 0.4) {
            createThoughtParticle(node.x, node.y);
          }
        });

        // Create analysis waves from AI core
        if (animationTime >= 4 && Math.random() < 0.1) {
          createAnalysisWave(centerX, centerY - 80);
        }
      }

      // Update and draw data streams
      dataStreams.forEach((stream, i) => {
        stream.progress += stream.speed;
        
        if (stream.progress >= 1) {
          dataStreams.splice(i, 1);
          return;
        }
        
        const x = stream.x + (stream.targetX - stream.x) * stream.progress;
        const y = stream.y + (stream.targetY - stream.y) * stream.progress;
        
        // Draw stream with trail
        for (let j = 0; j < 5; j++) {
          const trailProgress = stream.progress - j * 0.05;
          if (trailProgress < 0) continue;
          const trailX = stream.x + (stream.targetX - stream.x) * trailProgress;
          const trailY = stream.y + (stream.targetY - stream.y) * trailProgress;
          const opacity = (1 - j * 0.2) * (1 - trailProgress);
          
          const glowGrad = ctx.createRadialGradient(trailX, trailY, 0, trailX, trailY, stream.size * 2);
          glowGrad.addColorStop(0, `${stream.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`);
          glowGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(trailX, trailY, stream.size * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Main particle
        const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, stream.size * 3);
        glowGrad.addColorStop(0, stream.color);
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(x, y, stream.size * 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = stream.color;
        ctx.beginPath();
        ctx.arc(x, y, stream.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Update and draw thought particles
      thoughtParticles.forEach((particle, i) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life++;
        
        if (particle.life >= particle.maxLife) {
          thoughtParticles.splice(i, 1);
          return;
        }
        
        const progress = particle.life / particle.maxLife;
        const opacity = 1 - progress;
        const size = particle.size * (1 - progress * 0.5);
        
        // Glow
        const glowGrad = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, size * 4);
        glowGrad.addColorStop(0, `${particle.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`);
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size * 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Particle
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Update and draw analysis waves
      analysisWaves.forEach((wave, i) => {
        wave.radius += 2;
        wave.life++;
        
        if (wave.radius >= wave.maxRadius) {
          analysisWaves.splice(i, 1);
          return;
        }
        
        const opacity = (1 - wave.radius / wave.maxRadius) * 0.3;
        
        ctx.strokeStyle = `rgba(102, 126, 234, ${opacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Download visualization (bottom center) - appears at 8 seconds
      if (animationTime >= 8) {
        const downloadY = centerY + 140;
        const bounce = Math.sin((animationTime - 8) * 5) * 10;
        const pulse = Math.sin(animationTime * 8) * 0.3 + 1;
        
        // Multiple glow layers
        for (let i = 3; i >= 0; i--) {
          const glowGrad = ctx.createRadialGradient(centerX, downloadY + bounce, 0, centerX, downloadY + bounce, 50 - i * 8);
          glowGrad.addColorStop(0, `rgba(16, 185, 129, ${(pulse * (0.5 - i * 0.1))})`);
          glowGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(centerX, downloadY + bounce, 50 - i * 8, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Glassmorphic bubble
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.beginPath();
        ctx.arc(centerX, downloadY + bounce, 45 * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = `rgba(16, 185, 129, ${pulse * 0.9})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(centerX, downloadY + bounce, 45 * pulse, 0, Math.PI * 2);
        ctx.stroke();
        
        // Download arrow
        ctx.strokeStyle = '#10b981';
        ctx.fillStyle = '#10b981';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(centerX, downloadY - 25 + bounce);
        ctx.lineTo(centerX, downloadY + 30 + bounce);
        ctx.moveTo(centerX - 20, downloadY + 10 + bounce);
        ctx.lineTo(centerX, downloadY + 30 + bounce);
        ctx.lineTo(centerX + 20, downloadY + 10 + bounce);
        ctx.stroke();
      }

      // Floating AI intelligence particles
      for (let i = 0; i < 40; i++) {
        const angle = (animationTime * 0.3 + i) * 2;
        const radius = 180 + Math.sin(animationTime * 0.5 + i) * 60;
        const sparkleX = centerX + Math.cos(angle) * radius;
        const sparkleY = centerY + Math.sin(angle) * radius;
        const opacity = 0.2 + Math.sin(animationTime * 4 + i) * 0.3;
        
        // Glow
        const glowGrad = ctx.createRadialGradient(sparkleX, sparkleY, 0, sparkleX, sparkleY, 12);
        glowGrad.addColorStop(0, `rgba(102, 126, 234, ${opacity})`);
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Particle
        ctx.fillStyle = `rgba(102, 126, 234, ${opacity * 2})`;
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', setCanvasSize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [onEnded]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-2xl"
        style={{ 
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 50%, rgba(236, 72, 153, 0.1) 100%)',
          backdropFilter: 'blur(10px)',
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 pointer-events-none">
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500/40 blur-2xl rounded-full animate-pulse"></div>
            <Brain className="w-12 h-12 text-purple-400 relative z-10" />
          </div>
          <div>
            <div className="text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent tracking-tight">
              AI INTELLIGENCE
            </div>
            <div className="text-lg font-light text-purple-300 tracking-widest">
              PROCESSING & LEARNING
            </div>
          </div>
        </div>
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 text-center">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/40 blur-2xl rounded-full animate-pulse"></div>
              <Download className="w-10 h-10 text-green-400 relative z-10" />
            </div>
            <div>
              <div className="text-3xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                DOWNLOADING VIDEOS
              </div>
              <p className="text-sm font-light text-purple-300 tracking-widest mt-1">
                AI-POWERED VIDEO EXTRACTION FROM YOUTUBE & TIKTOK
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
