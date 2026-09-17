import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth";
import * as offerCtrl from "./offer.controller";

const router = Router();

router.use(authenticate);

router.get("/", offerCtrl.listOffers);
router.get("/:id", offerCtrl.getOffer);
router.post("/", authorize("COMPANY", "ADMIN"), offerCtrl.createOffer);
router.patch("/:id/respond", authorize("STUDENT"), offerCtrl.respondToOffer);

export default router;
