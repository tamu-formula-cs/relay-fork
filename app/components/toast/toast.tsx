import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import styles from "./toast.module.css"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={`${styles.toastViewport} ${className}`}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & { variant?: "default" | "destructive" | "affirmation" }
>(({ className, variant = "default", ...props }, ref) => {
  const variantClass = 
    variant === "destructive"
      ? styles.destructive
      : variant === "affirmation"
      ? styles.affirmation
      : styles.default;

  return (
    <ToastPrimitives.Root
      ref={ref}
      data-state={props.open ? "open" : "closed"}
      className={`${styles.toastContainer} ${variantClass} ${className}`}
      {...props}
    />
  );
});

Toast.displayName = ToastPrimitives.Root.displayName;


const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={`${styles.toastActionButton} ${className}`}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={`${styles.toastTitle} ${className}`} {...props} />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={`${styles.toastDescription} ${className}`}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

export interface ToastProps extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> {
  variant?: "default" | "destructive" | "affirmation";
}

export type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
}