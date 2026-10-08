import { motion } from "framer-motion";

export default function PythosBrand() {
  return (
    <motion.div
      className="pythos-brand"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
    >
      <span className="brand-line" />
      <span>BUILT BY PYTHOSX</span>
      <span className="brand-line" />
    </motion.div>
  );
}
