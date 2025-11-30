import { useEffect, useRef } from 'react';
import { Download, Brain } from 'lucide-react';

interface AIVideoDemoProps {
  className?: string;
}

export const AIVideoDemo = ({ className = '' }: AIVideoDemoProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

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
    let time = 0;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
    }> = [];

    // Create particles
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 3 + 1,
        color: `hsl(${Math.random() * 60 + 240}, 70%, 60%)`,
      });
    }

    const animate = () => {
      time += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgba(102, 126, 234, 0.1)');
      gradient.addColorStop(0.5, 'rgba(118, 75, 162, 0.1)');
      gradient.addColorStop(1, 'rgba(236, 72, 153, 0.1)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw particles
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();
      });

      // Draw animated circles (representing AI processing)
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      for (let i = 0; i < 3; i++) {
        const radius = 80 + Math.sin(time + i) * 20;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(102, 126, 234, ${0.3 - i * 0.1})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw YouTube icon (left) - larger and more prominent
      const youtubeX = canvas.width * 0.2;
      const youtubeY = centerY - 50;
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(youtubeX, youtubeY, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.moveTo(youtubeX - 12, youtubeY - 12);
      ctx.lineTo(youtubeX - 12, youtubeY + 12);
      ctx.lineTo(youtubeX + 18, youtubeY);
      ctx.closePath();
      ctx.fill();
      
      // Draw "YouTube" text below icon
      ctx.fillStyle = 'white';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('YouTube', youtubeX, youtubeY + 60);

      // Draw TikTok icon (right) - larger and more prominent
      const tiktokX = canvas.width * 0.8;
      const tiktokY = centerY - 50;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(tiktokX, tiktokY, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('♪', tiktokX, tiktokY);
      
      // Draw "TikTok" text below icon
      ctx.fillStyle = 'white';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('TikTok', tiktokX, tiktokY + 60);

      // Draw AI Brain icon (center top)
      const brainX = centerX;
      const brainY = centerY - 100;
      ctx.fillStyle = 'rgba(102, 126, 234, 0.8)';
      ctx.beginPath();
      ctx.arc(brainX, brainY, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('AI', brainX, brainY);

      // Draw download arrows from YouTube and TikTok to center
      const arrowY = centerY + 30;
      
      // Arrow from YouTube
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(youtubeX + 50, youtubeY);
      ctx.lineTo(centerX - 30, arrowY);
      ctx.stroke();
      // Arrowhead
      ctx.beginPath();
      ctx.moveTo(centerX - 30, arrowY);
      ctx.lineTo(centerX - 40, arrowY - 8);
      ctx.lineTo(centerX - 40, arrowY + 8);
      ctx.closePath();
      ctx.fillStyle = '#10b981';
      ctx.fill();
      
      // Arrow from TikTok
      ctx.beginPath();
      ctx.moveTo(tiktokX - 50, tiktokY);
      ctx.lineTo(centerX + 30, arrowY);
      ctx.stroke();
      // Arrowhead
      ctx.beginPath();
      ctx.moveTo(centerX + 30, arrowY);
      ctx.lineTo(centerX + 40, arrowY - 8);
      ctx.lineTo(centerX + 40, arrowY + 8);
      ctx.closePath();
      ctx.fill();

      // Draw download icon (center bottom, animated)
      const downloadIconY = arrowY + 40 + Math.sin(time * 2) * 5;
      ctx.strokeStyle = '#10b981';
      ctx.fillStyle = '#10b981';
      ctx.lineWidth = 4;
      // Download arrow
      ctx.beginPath();
      ctx.moveTo(centerX, downloadIconY - 20);
      ctx.lineTo(centerX, downloadIconY + 20);
      ctx.moveTo(centerX - 12, downloadIconY + 8);
      ctx.lineTo(centerX, downloadIconY + 20);
      ctx.lineTo(centerX + 12, downloadIconY + 8);
      ctx.stroke();

      // Draw AI sparkles
      for (let i = 0; i < 10; i++) {
        const angle = (time * 0.5 + i) * 2;
        const sparkleX = centerX + Math.cos(angle) * 100;
        const sparkleY = centerY + Math.sin(angle) * 100;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(time * 3 + i) * 0.5})`;
        ctx.beginPath();
        ctx.arc(sparkleX, sparkleY, 3, 0, Math.PI * 2);
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
  }, []);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-2xl"
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #ec4899 100%)' }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 pointer-events-none">
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 flex items-center gap-2">
          <Brain className="w-8 h-8 text-purple-400 animate-pulse" />
          <span className="text-2xl font-bold">AI Processing</span>
        </div>
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
          <div className="flex items-center gap-2 mb-2">
            <Download className="w-6 h-6 text-green-400 animate-bounce" />
            <span className="text-xl font-semibold">Downloading Videos</span>
          </div>
          <p className="text-sm opacity-75">AI-powered video extraction from YouTube & TikTok</p>
        </div>
      </div>
    </div>
  );
};

