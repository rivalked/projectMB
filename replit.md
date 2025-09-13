# Overview

This is a CRM (Customer Relationship Management) system for beauty salons built with React (frontend) and Express.js (backend). The application manages clients, employees, services, appointments, finances, inventory, and branches for salon operations. It features a modern UI built with shadcn/ui components and Tailwind CSS, with PostgreSQL as the database using Drizzle ORM for data management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript and Vite for fast development
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **Authentication**: JWT-based authentication with token validation
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **API Design**: RESTful API with consistent error handling
- **Middleware**: Request logging and authentication middleware
- **Development**: Hot reloading with Vite integration

## Database Design
- **Users**: Authentication and user management
- **Branches**: Multi-location salon support
- **Clients**: Customer information and loyalty tracking
- **Employees**: Staff management with branch assignment
- **Services**: Service catalog with pricing and duration
- **Appointments**: Booking system linking clients, employees, and services
- **Payments**: Financial transaction tracking
- **Inventory**: Stock management per branch

## Authentication System
- JWT tokens with 24-hour expiration
- Token storage in localStorage
- Protected routes with authentication middleware
- Role-based access control (admin role)
- Token validation on both client and server

## Data Validation
- Shared schema definitions using Zod
- Type-safe data validation across frontend and backend
- Drizzle-zod integration for database schema validation
- Form validation with react-hook-form resolvers

# External Dependencies

## Database
- **Neon Database**: Serverless PostgreSQL database (@neondatabase/serverless)
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL support
- **Connection**: Environment-based DATABASE_URL configuration

## UI Components
- **Radix UI**: Comprehensive set of accessible UI primitives
- **Lucide React**: Modern icon library
- **Tailwind CSS**: Utility-first CSS framework
- **Class Variance Authority**: Type-safe variant API for components

## Development Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Type safety across the entire stack
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind integration

## Third-party Libraries
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Performant form library
- **Date-fns**: Date utility library with internationalization
- **Recharts**: React chart library for data visualization
- **Wouter**: Minimalist routing library
- **Nanoid**: URL-safe unique ID generator