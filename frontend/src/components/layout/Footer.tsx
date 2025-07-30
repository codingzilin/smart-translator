"use client";

import Link from "next/link";
import { Languages, Github, Twitter, Mail } from "lucide-react";

export const Footer = () => {
  return (
    <footer className='border-t bg-background'>
      <div className='container mx-auto px-4 py-8'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-8'>
          {/* Brand */}
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground'>
                <Languages className='h-4 w-4' />
              </div>
              <span className='font-semibold'>AI Translator</span>
            </div>
            <p className='text-sm text-muted-foreground'>
              AI-powered translation that understands context and tone.
            </p>
            <div className='flex items-center gap-4'>
              <Link
                href='https://github.com'
                className='text-muted-foreground hover:text-foreground'
              >
                <Github className='h-4 w-4' />
              </Link>
              <Link
                href='https://twitter.com'
                className='text-muted-foreground hover:text-foreground'
              >
                <Twitter className='h-4 w-4' />
              </Link>
              <Link
                href='mailto:support@aitranslator.com'
                className='text-muted-foreground hover:text-foreground'
              >
                <Mail className='h-4 w-4' />
              </Link>
            </div>
          </div>

          {/* Product */}
          <div className='space-y-3'>
            <h3 className='font-medium'>Product</h3>
            <div className='space-y-2 text-sm'>
              <Link
                href='/features'
                className='block text-muted-foreground hover:text-foreground'
              >
                Features
              </Link>
              <Link
                href='/pricing'
                className='block text-muted-foreground hover:text-foreground'
              >
                Pricing
              </Link>
              <Link
                href='/api'
                className='block text-muted-foreground hover:text-foreground'
              >
                API
              </Link>
              <Link
                href='/integrations'
                className='block text-muted-foreground hover:text-foreground'
              >
                Integrations
              </Link>
            </div>
          </div>

          {/* Support */}
          <div className='space-y-3'>
            <h3 className='font-medium'>Support</h3>
            <div className='space-y-2 text-sm'>
              <Link
                href='/help'
                className='block text-muted-foreground hover:text-foreground'
              >
                Help Center
              </Link>
              <Link
                href='/docs'
                className='block text-muted-foreground hover:text-foreground'
              >
                Documentation
              </Link>
              <Link
                href='/contact'
                className='block text-muted-foreground hover:text-foreground'
              >
                Contact Us
              </Link>
              <Link
                href='/status'
                className='block text-muted-foreground hover:text-foreground'
              >
                Status
              </Link>
            </div>
          </div>

          {/* Company */}
          <div className='space-y-3'>
            <h3 className='font-medium'>Company</h3>
            <div className='space-y-2 text-sm'>
              <Link
                href='/about'
                className='block text-muted-foreground hover:text-foreground'
              >
                About
              </Link>
              <Link
                href='/blog'
                className='block text-muted-foreground hover:text-foreground'
              >
                Blog
              </Link>
              <Link
                href='/careers'
                className='block text-muted-foreground hover:text-foreground'
              >
                Careers
              </Link>
              <Link
                href='/privacy'
                className='block text-muted-foreground hover:text-foreground'
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>

        <div className='border-t mt-8 pt-8 flex flex-col md:flex-row justify-between items-center'>
          <p className='text-sm text-muted-foreground'>
            © 2024 AI Translator. All rights reserved.
          </p>
          <div className='flex items-center gap-4 mt-4 md:mt-0'>
            <Link
              href='/terms'
              className='text-sm text-muted-foreground hover:text-foreground'
            >
              Terms of Service
            </Link>
            <Link
              href='/privacy'
              className='text-sm text-muted-foreground hover:text-foreground'
            >
              Privacy Policy
            </Link>
            <Link
              href='/cookies'
              className='text-sm text-muted-foreground hover:text-foreground'
            >
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
