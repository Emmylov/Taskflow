import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ordersRouter from "./orders";
import authRouter from "./auth";
import conversationsRouter from "./conversations";
import storageRouter from "./storage";
import onboardingRouter from "./onboarding";
import profileRouter from "./profile";
import deliverablesRouter from "./deliverables";
import tasksRouter from "./tasks";
import revenueRouter from "./revenue";
import billingRouter from "./billing";
import brandVaultRouter from "./brandVault";
import automationsRouter from "./automations";
import specialistAssessmentRouter from "./specialistAssessment";
import platformHandoverRouter from "./platformHandover";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(ordersRouter);
router.use(conversationsRouter);
router.use(storageRouter);
router.use(onboardingRouter);
router.use(profileRouter);
router.use(deliverablesRouter);
router.use(tasksRouter);
router.use(revenueRouter);
router.use(billingRouter);
router.use(brandVaultRouter);
router.use(automationsRouter);
router.use(specialistAssessmentRouter);
router.use(platformHandoverRouter);

export default router;
