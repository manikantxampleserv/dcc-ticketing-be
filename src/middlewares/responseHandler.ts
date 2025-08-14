import { Response, Request, NextFunction } from "express";

declare global {
  namespace Express {
    interface Response {
      success: (
        message: string,
        data?: any,
        statusCode?: number,
        pagination?: {
          current_page: number;
          total_pages: number;
          total_count: number;
          has_next: boolean;
          has_previous: boolean;
        }
      ) => Response;
      error: (error: string, statusCode?: number) => Response;
    }
  }
}

export const responseHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.success = function (
    message: string,
    data: any = null,
    statusCode: number = 200,
    pagination?: any
  ): Response {
    const response: any = {
      success: true,
      message,
    };

    if (data !== null) response.data = data;
    if (pagination) response.pagination = pagination;

    return this.status(statusCode).json(response);
  };

  res.error = function (error: string, statusCode: number = 500): Response {
    return this.status(statusCode).json({
      success: false,
      error,
    });
  };

  next();
};
