import { Module } from "@medusajs/framework/utils"
import FlashsreModuleService from "./service"

export const FLASHSRE_MODULE = "flashsre"

export default Module(FLASHSRE_MODULE, {
  service: FlashsreModuleService,
})
