import React from 'react';
import { motion, Variants } from "motion/react";

function LoadingThreeDotsJumping() {
    const dotVariants: Variants = {
        jump: {
            transform: "translateY(-20px)",
            transition: {
                duration: 0.8,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut",
            },
        },
    };

    return (
        <div className="flex items-center justify-center py-12">
            <motion.div
                animate="jump"
                transition={{ staggerChildren: 0.2 }}
                className="flex items-center justify-center gap-3"
            >
                <motion.div className="w-4 h-4 rounded-full bg-[#005576] shadow-lg shadow-[#005576]/20" variants={dotVariants} />
                <motion.div className="w-4 h-4 rounded-full bg-[#005576] shadow-lg shadow-[#005576]/20" variants={dotVariants} />
                <motion.div className="w-4 h-4 rounded-full bg-[#005576] shadow-lg shadow-[#005576]/20" variants={dotVariants} />
            </motion.div>
        </div>
    );
}

export default LoadingThreeDotsJumping;
